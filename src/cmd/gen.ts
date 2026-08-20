import { parseArgs } from "node:util";

import { people } from "#/data/people";
import { generateAllCandidates } from "#/generation/batch";
import type { MfluxModel } from "#/types";

const { values } = parseArgs({
  options: {
    model: {
      type: "string",
      default: "flux2-klein",
    },
  },
  allowPositionals: true,
});

const SELECTED_MODEL = values.model as MfluxModel;

async function main() {
  console.log(`Generating candidates for ${people.length} people...`);
  await generateAllCandidates(people, 3, SELECTED_MODEL);
  console.log("Generation phase complete.");
}

main().catch(console.error);
