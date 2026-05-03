import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  describeModelFailure,
  getRouter,
  getV6TokenBudgets,
  SONNET_4_6,
} from "@/lib/ai/model-router";

loadEnvLocal();

const budgets = getV6TokenBudgets();

console.log("[v6-preflight] model:", SONNET_4_6);
console.log("[v6-preflight] token budgets:", budgets);

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("[v6-preflight] unavailable: OPENROUTER_API_KEY is not configured");
    return;
  }

  try {
    const response = await getRouter().chat.completions.create({
      model: SONNET_4_6,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 16,
      temperature: 0,
    });
    console.log("[v6-preflight] available: model call succeeded");
    console.log("[v6-preflight] finish_reason:", response.choices[0]?.finish_reason ?? "unknown");
    console.log("[v6-preflight] response_length:", response.choices[0]?.message?.content?.length ?? 0);
  } catch (error) {
    const failure = describeModelFailure(error);
    console.log("[v6-preflight] unavailable:", failure.kind);
    if (failure.status) console.log("[v6-preflight] status:", failure.status);
    console.log("[v6-preflight] message:", failure.message);
    if (failure.kind === "credit-exhaustion") {
      console.log("[v6-preflight] warning: configured V6 budgets may exceed the current OpenRouter key balance.");
    }
  }
}

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

void main();
