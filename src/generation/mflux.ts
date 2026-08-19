import type { GenerationParams } from "#/types";

export async function generateWithMflux(params: GenerationParams): Promise<string> {
  const response = await fetch("http://127.0.0.1:8000/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      seed: params.seed,
      steps: params.steps,
      output_path: params.outputPath,
      quantize: params.quantize ?? 4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MFLUX Server Error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { status: string; path: string };
  return data.path;
}
