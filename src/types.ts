export type Task<T> = () => Promise<T>;

export type PersonRecord = {
  id: string;
  birthdate: string; // Format: "MM/DD/YYYY"
  gender: string;
  race: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  height: number; // inches
  weight: number; // pounds
};

export type CandidateMetadata = {
  personId: string;
  seed: number;
  model: string;
  prompt: string;
  score?: number;
};

export type GenerationParams = {
  model: MfluxModel;
  prompt: string;
  seed: number;
  outputPath: string;
  steps?: number;
  quantize?: number;
};

export type MfluxModel =
  | "z-image-turbo" // Fast, lightweight, 9 inference steps (0.0 guidance)
  | "flux2" // Alias for FLUX.2 Klein 4B (4-8 steps, low RAM)
  | "flux2-klein-4b" // FLUX.2 Klein 4B parameter model
  | "flux2-klein-9b" // FLUX.2 Klein 9B parameter model (higher fidelity)
  | "flux1-schnell" // FLUX.1 Schnell (4 steps)
  | "dev"; // FLUX.1 Dev (20–28 steps, highest quality, slower)

export type QualityReport = {
  sharpnessScore: number; // High variance = sharp eyes/skin texture
  isOverExposed: boolean; // Blown out whites check
  isUnderExposed: boolean; // Pitch black shadows check
  overallScore: number; // Normalized score 0-100
};
