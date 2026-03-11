import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { config as loadEnv } from 'dotenv';
import { GoogleGenAI } from '@google/genai';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const DEFAULT_OUT_DIR = path.resolve('tmp', 'gemini-image-cli');

function printUsage() {
  console.log(`
Usage:
  npm run gemini:image -- --prompt "your prompt" [--image path] [--image path2]
  npm run gemini:image -- --prompt-file path/to/prompt.txt [--image path] [--out-dir tmp/run1]

Options:
  --prompt <text>         Prompt text to send to Gemini
  --prompt-file <path>    Read prompt text from a file
  --image <path>          Reference image to include; may be repeated
  --model <name>          Model name (default: ${DEFAULT_MODEL})
  --out-dir <path>        Directory to write outputs (default: ${DEFAULT_OUT_DIR})
  --aspect-ratio <ratio>  Image aspect ratio, e.g. 1:1, 3:4, 16:9
  --help                  Show this help
`);
}

function parseArgs(argv) {
  const options = {
    prompt: '',
    promptFile: '',
    images: [],
    model: DEFAULT_MODEL,
    outDir: DEFAULT_OUT_DIR,
    aspectRatio: '',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--prompt':
        options.prompt = next ?? '';
        i++;
        break;
      case '--prompt-file':
        options.promptFile = next ?? '';
        i++;
        break;
      case '--image':
      case '--ref':
        if (next) {
          options.images.push(next);
          i++;
        }
        break;
      case '--model':
        options.model = next ?? DEFAULT_MODEL;
        i++;
        break;
      case '--out-dir':
        options.outDir = next ? path.resolve(next) : DEFAULT_OUT_DIR;
        i++;
        break;
      case '--aspect-ratio':
        options.aspectRatio = next ?? '';
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      throw new Error(`Unsupported image type for ${filePath}`);
  }
}

function extensionForMime(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

async function readPrompt(options) {
  if (options.promptFile) {
    return (await fs.readFile(path.resolve(options.promptFile), 'utf8')).trim();
  }
  return options.prompt.trim();
}

async function buildImageParts(imagePaths) {
  const parts = [];

  for (const imagePath of imagePaths) {
    const absolutePath = path.resolve(imagePath);
    const buffer = await fs.readFile(absolutePath);
    parts.push({
      inlineData: {
        mimeType: guessMimeType(absolutePath),
        data: buffer.toString('base64'),
      },
    });
  }

  return parts;
}

async function writeOutputs(response, outDir, metadata) {
  await fs.mkdir(outDir, { recursive: true });

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const textParts = parts
    .map((part) => part.text)
    .filter((value) => typeof value === 'string' && value.length > 0);
  const imageParts = parts.filter((part) => part.inlineData?.data);

  if (textParts.length > 0) {
    await fs.writeFile(path.join(outDir, 'response.txt'), textParts.join('\n\n'), 'utf8');
  }

  for (let index = 0; index < imageParts.length; index++) {
    const part = imageParts[index];
    const mimeType = part.inlineData?.mimeType ?? 'application/octet-stream';
    const extension = extensionForMime(mimeType) || '.bin';
    const outputPath = path.join(outDir, `image_${index + 1}${extension}`);
    const bytes = Buffer.from(part.inlineData.data, 'base64');
    await fs.writeFile(outputPath, bytes);
  }

  await fs.writeFile(
    path.join(outDir, 'metadata.json'),
    JSON.stringify(
      {
        ...metadata,
        responseId: response.responseId ?? null,
        modelVersion: response.modelVersion ?? null,
        textPartCount: textParts.length,
        imagePartCount: imageParts.length,
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    textPartCount: textParts.length,
    imagePartCount: imageParts.length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const prompt = await readPrompt(options);
  if (!prompt) {
    throw new Error('A prompt is required. Use --prompt or --prompt-file.');
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env.local or your shell.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const referenceParts = await buildImageParts(options.images);
  const fullPrompt = options.images.length > 0
    ? `Use the attached images as composition references only. Do not copy brand names, logos, or trade dress.\n\n${prompt}`
    : prompt;

  const response = await ai.models.generateContent({
    model: options.model,
    contents: [
      {
        role: 'user',
        parts: [
          ...referenceParts,
          { text: fullPrompt },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(options.aspectRatio
        ? {
            imageConfig: {
              aspectRatio: options.aspectRatio,
            },
          }
        : {}),
    },
  });

  const summary = await writeOutputs(response, options.outDir, {
    model: options.model,
    prompt,
    promptFile: options.promptFile || null,
    referenceImages: options.images.map((imagePath) => path.resolve(imagePath)),
    outDir: options.outDir,
    aspectRatio: options.aspectRatio || null,
  });

  console.log(`Saved Gemini response to ${options.outDir}`);
  console.log(`Text parts: ${summary.textPartCount}`);
  console.log(`Image parts: ${summary.imagePartCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
