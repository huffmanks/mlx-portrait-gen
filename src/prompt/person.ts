import type { PersonRecord } from "#/types";

function calculateAge(birthdate: string): number {
  const birthDate = new Date(birthdate);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return remainingInches > 0 ? `${feet} feet ${remainingInches} inches` : `${feet} feet`;
}

export function personPrompt(person: PersonRecord): string {
  const age = calculateAge(person.birthdate);
  const heightFormatted = formatHeight(person.height);

  return (
    `A photorealistic portrait of a ${age}-year-old ${person.gender} of ${person.race} descent. ` +
    `The subject is ${heightFormatted} tall, weighing approximately ${person.weight} lbs. ` +
    `They have ${person.hairColor} ${person.hairStyle} hair and ${person.eyeColor} eyes.`
  );
}
