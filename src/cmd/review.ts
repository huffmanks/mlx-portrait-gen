import fs from "fs/promises";
import path from "path";

import { evaluateAllCandidates } from "#/generation/evaluate";
import { loadPersonMetadata } from "#/generation/metadata";
import type { CandidateBatchMap, MfluxModel } from "#/types";

async function main() {
  const SELECTED_MODEL_NAME: MfluxModel = "flux2-klein-4b";

  const outputDir = path.resolve("./output");
  const candidatesMap: CandidateBatchMap = {};

  const personDirs = await fs.readdir(outputDir).catch(() => []);

  for (const personId of personDirs) {
    const personPath = path.join(outputDir, personId);
    const stat = await fs.stat(personPath).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const metadata = await loadPersonMetadata(outputDir, personId);
    if (metadata.candidates.length === 0) {
      console.warn(`No candidates found for ${personId}`);
      continue;
    }

    candidatesMap[personId] = metadata.candidates;
  }

  const folderCount = Object.keys(candidatesMap).length;
  if (folderCount === 0) {
    console.error("No candidates found in ./output. Run 'just gen' to generate images first.");
    return;
  }

  console.log(`Reviewing candidates across ${folderCount} folders...`);
  const results = await evaluateAllCandidates(candidatesMap, SELECTED_MODEL_NAME);

  console.log("\nEvaluation Summary:");
  for (const personId of Object.keys(results)) {
    const evals = results[personId].sort((a, b) => (b.scores?.overallScore ?? 0) - (a.scores?.overallScore ?? 0));
    const best = evals[0];
    if (best) {
      console.log(`[${personId}] Top Score: ${best.scores?.overallScore}/100 (${path.basename(best.candidatePath)})`);
    }
  }
}

main().catch(console.error);
