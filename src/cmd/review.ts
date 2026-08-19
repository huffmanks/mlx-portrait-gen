import fs from "fs/promises";
import path from "path";

import { evaluateAllCandidates } from "#/quality/evaluate";
import type { CandidateBatchMap, CandidateMetadata, MfluxModel } from "#/types";

async function main() {
  const SELECTED_MODEL_NAME: MfluxModel = "flux2-klein-4b";

  const outputDir = path.resolve("./output");
  const candidatesMap: CandidateBatchMap = {};

  const personDirs = await fs.readdir(outputDir).catch(() => []);

  for (const personId of personDirs) {
    const personPath = path.join(outputDir, personId);
    const stat = await fs.stat(personPath).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const files = await fs.readdir(personPath);
    const pngFiles = files.filter(
      (f) => f.toLowerCase().endsWith(".png") && (f.startsWith("candidate_") || f.startsWith("portrait_")),
    );

    if (pngFiles.length === 0) {
      console.warn(`No PNG candidate images found in ./output/${personId}`);
      continue;
    }

    let aggregatedMeta: CandidateMetadata[] = [];
    try {
      const metaContent = await fs.readFile(path.join(personPath, "metadata.json"), "utf-8");
      aggregatedMeta = JSON.parse(metaContent) as CandidateMetadata[];
    } catch {}

    candidatesMap[personId] = await Promise.all(
      pngFiles.map(async (file) => {
        const seedStr = file.replace(/[^0-9]/g, "");
        const seed = parseInt(seedStr, 10) || 0;

        return {
          personId,
          seed,
          candidatePath: path.join(personPath, file),
          prompt: "",
        };
      }),
    );
  }

  const folderCount = Object.keys(candidatesMap).length;
  if (folderCount === 0) {
    console.error("No candidate PNGs found in ./output. Run 'just gen' to generate images first.");
    return;
  }

  console.log(`Reviewing candidates across ${folderCount} folders...`);
  const results = await evaluateAllCandidates(candidatesMap, SELECTED_MODEL_NAME);

  console.log("\nEvaluation Summary:");
  for (const personId of Object.keys(results)) {
    const evals = results[personId].sort((a, b) => b.overallScore - a.overallScore);
    const best = evals[0];
    if (best) {
      console.log(`[${personId}] Top Score: ${best.overallScore}/100 (${path.basename(best.candidatePath)})`);
    }
  }
}

main().catch(console.error);
