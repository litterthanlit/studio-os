import fs from "node:fs";
import path from "node:path";

type LaunchScenario = {
  id: string;
  benchmarkSetId: string;
  mustProve: string[];
};

type LaunchBenchmarkFile = {
  passCriteria: {
    minimumScenarioCount: number;
    minimumReferencesPerScenario: number;
    requiredControls: string[];
  };
  scenarios: LaunchScenario[];
};

type BenchmarkSet = {
  id: string;
  references?: Array<{ imageUrl?: string }>;
};

type BenchmarkSetsFile = {
  sets: BenchmarkSet[];
};

const root = process.cwd();
const launchPath = path.join(root, "launch-benchmark-scenarios.json");
const setsPath = path.join(root, "benchmark-sets.json");
const strict = process.argv.includes("--strict");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

const launch = readJson<LaunchBenchmarkFile>(launchPath);
const benchmarkSets = readJson<BenchmarkSetsFile>(setsPath);
const setsById = new Map(benchmarkSets.sets.map((set) => [set.id, set]));
const failures: string[] = [];

if (launch.scenarios.length < launch.passCriteria.minimumScenarioCount) {
  failures.push(
    `Expected at least ${launch.passCriteria.minimumScenarioCount} launch scenarios, found ${launch.scenarios.length}.`
  );
}

for (const scenario of launch.scenarios) {
  const set = setsById.get(scenario.benchmarkSetId);
  if (!set) {
    failures.push(`${scenario.id} references missing benchmark set ${scenario.benchmarkSetId}.`);
    continue;
  }

  const resolvedRefs = (set.references ?? []).filter(
    (ref) => ref.imageUrl && ref.imageUrl !== "TODO"
  );
  if (resolvedRefs.length < launch.passCriteria.minimumReferencesPerScenario) {
    failures.push(
      `${scenario.id} needs ${launch.passCriteria.minimumReferencesPerScenario}+ resolved references; found ${resolvedRefs.length}.`
    );
  }

  if (scenario.mustProve.length < 3) {
    failures.push(`${scenario.id} should define at least 3 proof checks.`);
  }
}

const productSurfaceFiles = [
  "app/canvas-v1/components/TasteCard.tsx",
  "app/canvas-v1/components/PromptComposerV2.tsx",
  "app/canvas-v1/components/InspectorPanelV3.tsx",
  "app/canvas-v1/components/inspector/ExportTab.tsx",
];
const productSurface = productSurfaceFiles
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

for (const control of launch.passCriteria.requiredControls) {
  const expected =
    control === "Taste Brief visible before generation"
      ? "Taste brief"
      : control === "Section-level regeneration available"
        ? "Section regen"
        : control === "Export preflight visible before publish"
          ? "Publish preflight"
          : control;

  if (!productSurface.includes(expected)) {
    failures.push(`Missing required launch control: ${control}.`);
  }
}

if (failures.length > 0) {
  const heading = strict
    ? "Launch benchmark preflight failed:"
    : "Launch benchmark preflight found gaps:";
  console.error(heading);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (strict) {
    process.exit(1);
  }
  console.error("\nRun with --strict once the launch reference packs are complete.");
  process.exit(0);
}

console.log(`Launch benchmark preflight passed: ${launch.scenarios.length} scenarios checked.`);
