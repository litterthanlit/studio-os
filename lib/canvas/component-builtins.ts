// lib/canvas/component-builtins.ts
// Wraps the 7 built-in template factories as ComponentMaster objects with stable builtin- IDs.
// Built-in masters are generated once and cached; the cached tree is the canonical reference
// for override addressing on ComponentInstance nodes.

import { createTemplateById } from "./design-component-library";
import type { ComponentMaster } from "./design-node";

// ── Builtin registry ──────────────────────────────────────────────────────────

type BuiltinDef = {
  id: string;           // stable builtin-* ID used by ComponentInstance.masterId
  templateId: string;   // template-* ID used by design-component-library
  name: string;
  category: string;
};

const BUILTIN_DEFS: BuiltinDef[] = [
  { id: "builtin-hero",     templateId: "template-hero",     name: "Hero",          category: "Layout"  },
  { id: "builtin-split",    templateId: "template-split",    name: "Split Content", category: "Layout"  },
  { id: "builtin-features", templateId: "template-features", name: "Features Grid", category: "Content" },
  { id: "builtin-quote",    templateId: "template-quote",    name: "Quote Block",   category: "Content" },
  { id: "builtin-proof",    templateId: "template-proof",    name: "Proof Row",     category: "Content" },
  { id: "builtin-cta",      templateId: "template-cta",      name: "CTA Banner",    category: "Action"  },
  { id: "builtin-footer",   templateId: "template-footer",   name: "Footer",        category: "Action"  },
];

// Cache: built-in trees are generated once and reused.
// The tree is the canonical reference for override addressing.
let cachedBuiltins: ComponentMaster[] | null = null;

export function getBuiltinMasters(): ComponentMaster[] {
  if (cachedBuiltins) return cachedBuiltins;

  const now = new Date().toISOString();

  cachedBuiltins = BUILTIN_DEFS.map((def) => {
    const component = createTemplateById(def.templateId);
    if (!component) {
      throw new Error(`[component-builtins] Failed to create template for builtin "${def.id}" (templateId: "${def.templateId}")`);
    }
    return {
      id: def.id,
      name: def.name,
      category: def.category,
      source: "builtin" as const,
      tree: component.node,
      version: 1,
      createdAt: now,
      updatedAt: now,
    } satisfies ComponentMaster;
  });

  return cachedBuiltins;
}

export function getBuiltinMaster(id: string): ComponentMaster | null {
  return getBuiltinMasters().find((m) => m.id === id) ?? null;
}

export function isBuiltinMasterId(id: string): boolean {
  return id.startsWith("builtin-");
}
