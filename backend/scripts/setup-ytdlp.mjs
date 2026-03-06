import { chmodSync, createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const binDir = join(backendRoot, 'bin');

const isWindows = process.platform === 'win32';
const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const targetPath = join(binDir, binaryName);
const downloadUrl = isWindows
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

async function setupYtDlp() {
  mkdirSync(binDir, { recursive: true });

  if (existsSync(targetPath)) {
    console.log(`[setup-ytdlp] Binary already exists: ${targetPath}`);
    return;
  }

  console.log(`[setup-ytdlp] Downloading ${downloadUrl}`);

  const response = await fetch(downloadUrl, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  await pipeline(response.body, createWriteStream(targetPath));

  if (!isWindows) {
    chmodSync(targetPath, 0o755);
  }

  console.log(`[setup-ytdlp] Installed binary at ${targetPath}`);
}

setupYtDlp().catch((error) => {
  console.warn(`[setup-ytdlp] Skipped automatic install: ${error.message}`);
  console.warn('[setup-ytdlp] Service will use system yt-dlp if available.');
});
