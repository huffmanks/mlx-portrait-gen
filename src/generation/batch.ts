import fs from "fs/promises";
import path from "path";

import { fileExists, loadPersonMetadata, upsertCandidate } from "#/generation/metadata";
import { generateWithMflux, unloadMfluxModel } from "#/generation/mflux";
import { seedForPerson } from "#/generation/seed";
import { backgroundPrompts } from "#/prompt/background";
import { compositionPrompts } from "#/prompt/composition";
import { lightingPrompts } from "#/prompt/lighting";
import { personPrompt } from "#/prompt/person";
import { photographyPrompts } from "#/prompt/photography";
import type { CandidateBatchMap, MfluxModel, PersonRecord } from "#/types";

export async function generateAllCandidates(
  database: Array<PersonRecord>,
  candidatesPerPerson = 3,
  selectedModel: MfluxModel = "flux2-klein-4b",
  isRetry = false,
) {
  const outputDir = path.resolve("./output");
  const candidatesMap: CandidateBatchMap = {};

  let interrupted = false;
  async function cleanupAndExit() {
    if (interrupted) return;
    interrupted = true;

    console.warn("\nInterrupted — letting any in-flight generation finish, then unloading model...");
    await unloadMfluxModel();
    process.exit(130);
  }

  process.on("SIGINT", cleanupAndExit);
  process.on("SIGTERM", cleanupAndExit);

  try {
    for (const person of database) {
      const baseSeed = seedForPerson(person.id);
      const bgIndex = Math.abs(baseSeed) % backgroundPrompts.length;
      const background = backgroundPrompts[bgIndex];

      const fullPrompt = [
        personPrompt(person),
        photographyPrompts.join(" "),
        compositionPrompts.join(" "),
        lightingPrompts.join(" "),
        `Background: ${background}`,
      ].join("\n\n");

      const personFolder = path.join(outputDir, person.id);
      await fs.mkdir(personFolder, { recursive: true });
      candidatesMap[person.id] = [];

      let startAttempt = 0;
      if (isRetry) {
        const existingMeta = await loadPersonMetadata(outputDir, person.id);
        const usedOffsets = existingMeta.candidates.map((c) => c.seed - baseSeed);
        const maxOffset = usedOffsets.length ? Math.max(...usedOffsets) : -1;
        startAttempt = maxOffset + 1;
      }

      for (let i = 0; i < candidatesPerPerson; i++) {
        const attempt = startAttempt + i;
        const candidateSeed = baseSeed + attempt;
        const candidatePath = path.join(personFolder, `candidate_${candidateSeed}.png`);

        if (await fileExists(candidatePath)) {
          console.log(`Skipping [${person.id}] candidate ${attempt + 1} (Seed: ${candidateSeed}) — already exists.`);
        } else {
          console.log(`Generating [${person.id}] candidate ${attempt + 1} (Seed: ${candidateSeed})...`);

          await generateWithMflux({
            model: selectedModel,
            prompt: fullPrompt,
            seed: candidateSeed,
            outputPath: candidatePath,
          });
        }

        await upsertCandidate(outputDir, person.id, {
          seed: candidateSeed,
          model: selectedModel,
          prompt: fullPrompt,
          candidatePath,
        });

        candidatesMap[person.id].push({
          seed: candidateSeed,
          model: selectedModel,
          prompt: fullPrompt,
          candidatePath,
        });
      }
    }

    await unloadMfluxModel();

    return candidatesMap;
  } finally {
    process.off("SIGINT", cleanupAndExit);
    process.off("SIGTERM", cleanupAndExit);
  }
}
