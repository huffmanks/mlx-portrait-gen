import path from "path";

import { people } from "#/data/people";
import { loadPersonMetadata, savePersonMetadata } from "#/generation/metadata";
import { upscaleWithMflux } from "#/generation/mflux";
import { fileExists } from "#/lib/utils";

async function main() {
  const outputDir = path.resolve("./output");

  for (const person of people) {
    const metadata = await loadPersonMetadata(outputDir, person.id);
    const scored = metadata.candidates.filter((c) => c.scores);

    if (scored.length === 0) {
      console.warn(`[${person.id}] No evaluated candidates found. Run 'just review' first. Skipping.`);
      continue;
    }

    const best = scored.reduce((a, b) => (b.scores!.overallScore > a.scores!.overallScore ? b : a));
    const upscaledPath = path.join(outputDir, person.id, `final_upscaled_${best.seed}.png`);

    if (await fileExists(upscaledPath)) {
      console.log(`[${person.id}] Upscaled output already exists — skipping.`);
      continue;
    }

    console.log(
      `[${person.id}] Upscaling top candidate (seed ${best.seed}, score ${best.scores!.overallScore}/100)...`,
    );

    await upscaleWithMflux({
      imagePath: best.candidatePath,
      outputPath: upscaledPath,
      resolution: 2160,
    });

    metadata.finalCandidateSeed = best.seed;
    metadata.finalUpscaledPath = upscaledPath;
    await savePersonMetadata(outputDir, metadata);

    console.log(`[${person.id}] Saved upscaled portrait -> ${upscaledPath}`);
  }

  console.log("Upscale phase complete.");
}

main().catch(console.error);
