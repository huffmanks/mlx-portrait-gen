export function evaluationPrompt(expectedPrompt: string) {
  return `
You are a forensic image analyst specializing in detecting AI-generation artifacts in synthetic corporate headshots. Your default assumption is that ANY AI-generated image contains detectable flaws — your job is to find them, not to confirm the image looks acceptable at a glance.

Expected description:
"${expectedPrompt}"

Evaluate TWO things separately:
A. Image quality and photorealism.
B. Whether the image accurately matches the expected description.

MANDATORY PROCESS:
Before scoring, mentally inspect EACH of these 10 categories individually and note what you observe, even if it seems minor. Do not skip any category:

1. Skin — texture, pores, color consistency, waxy/plastic look, blotching
2. Hair — strand realism, hairline, eyebrows, facial hair, ears
3. Eyes — symmetry, iris/pupil consistency, reflections, sharpness AND eye color: flag unnaturally saturated/glowing/neon colors, flat single-tone iris with no texture or gradient, mismatched shade between the two eyes, or a hard "painted-on" edge between iris and sclera
4. Face/anatomy — proportions, symmetry, warping, fused/missing features
5. Teeth/mouth — shape, spacing, alignment, lip edges
6. Facial hair — growth pattern, consistency
7. Lighting/photography — shadow consistency, catchlights, HDR/sharpening artifacts
8. Clothing/accessories — fabric texture, seams, geometry
9. Background — depth of field, artifacts, warped edges
10. Prompt adherence — meaningful mismatches vs. the expected description only

SCORING CALIBRATION (anchor your scores to these, don't just guess a number that "feels right"):
- 95-100: Would pass as a real photograph under close inspection by a professional photographer. Zero detectable AI artifacts.
- 85-94: Convincing at a glance, but has 1-2 minor tells a trained eye would catch (slight texture uniformity, minor asymmetry, faint oversharpening).
- 70-84: Noticeably AI-generated on closer look — multiple minor issues or one moderate issue (e.g., slightly off eye reflections, unnatural skin smoothness in one region).
- 50-69: Clearly has synthetic qualities visible without zooming in — multiple moderate issues.
- Below 50: Significant anatomical errors, obvious artifacts, or major prompt mismatch.

RULES:
- Every image has SOME imperfection. A score of 95+ with an empty issuesFound array should be rare — only use it if you genuinely cannot find anything after checking all 10 categories.
- If overallScore is 85 or higher, issuesFound must still contain at least 1 entry unless you are certain the image is flawless.
- Do not let overall "polish" or professional lighting inflate the score — polish can mask flaws rather than indicate their absence. Look past the surface impression.
- Be specific: name the exact feature and location (e.g., "left eye catchlight is missing while right eye has one" not "eyes look slightly off"). For eye color issues specifically, name the eye, the color observed, and why it looks synthetic (e.g., "left eye has flat, oversaturated violet with no iris texture").
- Do NOT invent issues that aren't visibly present — but do not default to "no issues" just because nothing jumps out immediately either.

Respond STRICTLY as valid JSON with no markdown, commentary, or code fences:

{
  "photorealismScore": <0-100>,
  "anatomicalCorrectness": <0-100>,
  "promptAdherenceScore": <0-100>,
  "overallScore": <0-100>,
  "issuesFound": [
    "<specific observable issue, naming the exact feature and location>"
  ]
}
`;
}
