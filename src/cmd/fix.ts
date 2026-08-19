import path from "path";

import { people } from "#/data/people";
import { generateAllCandidates } from "#/generation/batch";
import { loadPersonMetadata } from "#/generation/metadata";
import type { MfluxModel, PersonRecord } from "#/types";

const SCORE_THRESHOLD = 80;

async function main() {
  const SELECTED_MODEL_NAME: MfluxModel = "flux2-klein-4b";

  const outputDir = path.resolve("./output");
  const needsFixing: Array<PersonRecord> = [];

  for (const person of people) {
    const metadata = await loadPersonMetadata(outputDir, person.id);
    const scored = metadata.candidates.filter((c) => c.scores);

    if (scored.length === 0) {
      console.warn(
        `[${person.id}] No evaluated candidates found. Marked for retry. Run 'just review' first if this is unexpected.`,
      );
      needsFixing.push(person);
      continue;
    }

    const best = scored.reduce((a, b) => (b.scores!.overallScore > a.scores!.overallScore ? b : a));

    if (best.scores!.overallScore < SCORE_THRESHOLD) {
      console.warn(`[${person.id}] Top score was ${best.scores!.overallScore}/${SCORE_THRESHOLD}. Marked for retry.`);
      if (best.issues?.length) {
        console.warn(`  Issues to address: ${best.issues.join(", ")}`);
      }
      needsFixing.push(person);
    } else {
      console.log(`[${person.id}] Top score ${best.scores!.overallScore}/100 meets threshold.`);
    }
  }

  if (needsFixing.length === 0) {
    console.log("All people meet the quality threshold! No regeneration needed.");
    return;
  }

  console.log(`\nRegenerating replacement candidates for ${needsFixing.length} people...`);
  await generateAllCandidates(needsFixing, 3, SELECTED_MODEL_NAME, true);
  console.log("Repair generation complete. Run 'just review' to re-evaluate.");
}

main().catch(console.error);
