import { people } from "#/data/people";
import { generateAllCandidates } from "#/generation/batch";

async function main() {
  console.log(`Generating candidates for ${people.length} people...`);
  await generateAllCandidates(people, 3);
  console.log("Generation phase complete.");
}

main().catch(console.error);
