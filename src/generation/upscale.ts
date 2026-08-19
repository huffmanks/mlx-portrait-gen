// import { exec } from "child_process";
// import util from "util";

// const execPromise = util.promisify(exec);

// export async function upscalePortrait(inputPath: string, outputPath: string): Promise<string> {
//   const command = `realesrgan-ncnn-vulkan -i "${inputPath}" -o "${outputPath}" -s 2 -n realesrgan-x4plus`;

//   try {
//     await execPromise(command);
//     return outputPath;
//   } catch (err) {
//     console.warn("Upscaling failed, preserving original resolution:", err);
//     return inputPath;
//   }
// }
