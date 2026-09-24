/**
 * Minimal in-memory Convex runtime for proofs: runs real `convex/*.ts` query and
 * mutation handlers (`fn._handler(ctx, args)`) against an in-memory database with
 * the index-equality, order, filter and first/unique/collect semantics those
 * handlers use. Not a Convex replacement — enough to prove access paths and
 * data rules offline (no deployment reachable from proof environments).
 *
 * `@convex-dev/auth/server` is ESM-only and does not resolve under tsx's CJS
 * loader, so `installConvexAuthStub()` maps it to a stub whose `getAuthUserId`
 * matches the real one: identity.subject is "<userId>|<sessionId>".
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
import Module from "node:module";
import { join } from "node:path";

let stubInstalled = false;

export function installConvexAuthStub(): void {
  if (stubInstalled) return;
  stubInstalled = true;
  const stubPath = join(__dirname, "convex-auth-server-stub.ts");
  const mod = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const original = mod._resolveFilename;
  mod._resolveFilename = function (request: string, ...rest: unknown[]) {
    if (request === "@convex-dev/auth/server") return stubPath;
    return original.call(this, request, ...rest);
  };
}

type Doc = Record<string, any> & { _id: string; _creationTime: number };

type Constraint = { field: string; value: unknown };

function eqBuilder(constraints: Constraint[]) {
  const builder: any = {
    eq(field: string, value: unknown) {
      constraints.push({ field, value });
      return builder;
    },
    gte: () => builder,
    lte: () => builder,
    gt: () => builder,
    lt: () => builder,
  };
  return builder;
}

function filterExpr(q: any) {
  return q;
}

const filterBuilder = {
  field: (name: string) => ({ __field: name }),
  eq: (a: any, b: any) => (doc: Doc) => resolve(doc, a) === resolve(doc, b),
  neq: (a: any, b: any) => (doc: Doc) => resolve(doc, a) !== resolve(doc, b),
  and: (...fns: any[]) => (doc: Doc) => fns.every((fn) => fn(doc)),
  or: (...fns: any[]) => (doc: Doc) => fns.some((fn) => fn(doc)),
};

function resolve(doc: Doc, operand: any) {
  return operand && typeof operand === "object" && "__field" in operand ? doc[operand.__field] : operand;
}

export class FakeConvex {
  private tables = new Map<string, Map<string, Doc>>();
  private counter = 0;
  private clock = 1_700_000_000_000;
  identity: { subject: string; tokenIdentifier: string; email?: string } | null = null;
  storage = new Map<string, { contentType: string; size: number; url: string }>();

  now() {
    return ++this.clock;
  }

  table(name: string): Map<string, Doc> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  rows(name: string): Doc[] {
    return [...this.table(name).values()];
  }

  insertRaw(table: string, doc: Record<string, unknown>): string {
    const _id = `${table}:${(++this.counter).toString(36)}`;
    this.table(table).set(_id, { ...doc, _id, _creationTime: this.now() } as Doc);
    return _id;
  }

  private find(id: string): { table: string; doc: Doc } | null {
    const table = id.split(":")[0]!;
    const doc = this.tables.get(table)?.get(id);
    return doc ? { table, doc } : null;
  }

  /** Sign in as a user id (null signs out). */
  as(userId: string | null) {
    this.identity = userId ? { subject: `${userId}|session`, tokenIdentifier: `test|${userId}` } : null;
    return this;
  }

  ctx(): any {
    const self = this;
    const db = {
      get: async (id: string) => self.find(id)?.doc ?? null,
      insert: async (table: string, doc: Record<string, unknown>) => self.insertRaw(table, strip(doc)),
      patch: async (id: string, patch: Record<string, unknown>) => {
        const found = self.find(id);
        if (!found) throw new Error(`patch: ${id} not found`);
        const next: Doc = { ...found.doc };
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) delete next[key];
          else next[key] = value;
        }
        found.doc && self.table(found.table).set(id, next);
      },
      replace: async (id: string, doc: Record<string, unknown>) => {
        const found = self.find(id);
        if (!found) throw new Error(`replace: ${id} not found`);
        self.table(found.table).set(id, { ...strip(doc), _id: id, _creationTime: found.doc._creationTime } as Doc);
      },
      delete: async (id: string) => {
        const found = self.find(id);
        if (found) self.table(found.table).delete(id);
      },
      query: (table: string) => self.queryBuilder(table),
      system: {
        get: async (id: string) => {
          const entry = self.storage.get(id);
          return entry ? { _id: id, contentType: entry.contentType, size: entry.size } : null;
        },
      },
    };
    return {
      db,
      auth: { getUserIdentity: async () => self.identity },
      storage: {
        generateUploadUrl: async () => "https://fake.convex/upload",
        getUrl: async (id: string) => self.storage.get(id)?.url ?? null,
        delete: async (id: string) => void self.storage.delete(id),
      },
    };
  }

  private queryBuilder(table: string) {
    const constraints: Constraint[] = [];
    const predicates: Array<(doc: Doc) => boolean> = [];
    let direction: "asc" | "desc" = "asc";
    const run = () => {
      const docs = this.rows(table)
        .filter((doc) => constraints.every((c) => doc[c.field] === c.value))
        .filter((doc) => predicates.every((p) => p(doc)))
        .sort((a, b) => a._creationTime - b._creationTime);
      return direction === "desc" ? docs.reverse() : docs;
    };
    const builder: any = {
      withIndex: (_name: string, fn?: (q: any) => any) => {
        if (fn) fn(eqBuilder(constraints));
        return builder;
      },
      filter: (fn: (q: any) => any) => {
        predicates.push(fn(filterExpr(filterBuilder)));
        return builder;
      },
      order: (dir: "asc" | "desc") => {
        direction = dir;
        return builder;
      },
      collect: async () => run(),
      take: async (n: number) => run().slice(0, n),
      first: async () => run()[0] ?? null,
      unique: async () => {
        const docs = run();
        if (docs.length > 1) throw new Error(`unique: ${docs.length} rows in ${table}`);
        return docs[0] ?? null;
      },
    };
    return builder;
  }

  /** Run a registered query/mutation handler with the current identity. */
  async run<T = any>(fn: unknown, args: Record<string, unknown>): Promise<T> {
    const handler = (fn as { _handler?: (ctx: unknown, args: unknown) => Promise<T> })._handler;
    if (!handler) throw new Error("not a registered Convex function");
    return handler(this.ctx(), args);
  }

  /** Expect a handler to throw; returns the error message. */
  async fails(fn: unknown, args: Record<string, unknown>): Promise<string> {
    try {
      await this.run(fn, args);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    throw new Error("expected the call to fail");
  }
}

function strip(doc: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(doc).filter(([, value]) => value !== undefined));
}

/** Seed a user + project owned by that user. */
export function seedOwner(db: FakeConvex, name: string) {
  const userId = db.insertRaw("users", { name, email: `${name}@example.com`, status: "active" });
  const projectId = db.insertRaw("projects", {
    ownerId: userId,
    name: `${name}'s project`,
    slug: `${name}-project`,
    color: "#4B57DB",
    visibility: "private",
    status: "active",
    createdAt: db.now(),
    updatedAt: db.now(),
  });
  return { userId, projectId };
}
