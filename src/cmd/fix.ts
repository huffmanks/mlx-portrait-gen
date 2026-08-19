import path from "path";

import { people } from "#/data/people";
import { generateAllCandidates } from "#/generation/batch";
import { loadPersonMetadata } from "#/generation/metadata";
import type { PersonRecord } from "#/types";

const SCORE_THRESHOLD = 80;

async function main() {
  const outputDir = path.resolve("./output");
  const needsFixing: PersonRecord[] = [];

  for (const person of people) {
    const personDir = path.join(outputDir, person.id);
    const metaList = await loadPersonMetadata(personDir);

    if (metaList.length === 0) {
      console.warn(`[${person.id}] No metadata found. Marked for generation.`);
      needsFixing.push(person);
      continue;
    }

    const best = metaList.reduce((a, b) => (b.overallScore > a.overallScore ? b : a));

    if (best.overallScore < SCORE_THRESHOLD) {
      console.warn(`[${person.id}] Top score was ${best.overallScore}/${SCORE_THRESHOLD}. Marked for retry.`);
      if (best.issues?.length) {
        console.warn(`  Issues to address: ${best.issues.join(", ")}`);
      }
      needsFixing.push(person);
    } else {
      console.log(`[${person.id}] Top score ${best.overallScore}/100 meets threshold.`);
    }
  }

  if (needsFixing.length === 0) {
    console.log("All people meet the quality threshold! No regeneration needed.");
    return;
  }

  console.log(`\nRegenerating replacement candidates for ${needsFixing.length} people...`);
  await generateAllCandidates(needsFixing, 3);
  console.log("Repair generation complete. Run 'just review' to re-evaluate.");
}

main().catch(console.error);
