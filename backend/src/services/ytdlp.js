import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..', '..');
const bundledYtDlpPath = join(backendRoot, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const extractorArgs = process.env.YTDLP_EXTRACTOR_ARGS || 'youtube:player_client=android,web';
const jsRuntimes = process.env.YTDLP_JS_RUNTIMES || 'node';

function resolveCookiesPath() {
    const configuredCookiesPath = process.env.YTDLP_COOKIES_PATH;
    if (configuredCookiesPath) {
        if (existsSync(configuredCookiesPath)) {
            return configuredCookiesPath;
        }
        console.warn(`[yt-dlp] YTDLP_COOKIES_PATH not found: ${configuredCookiesPath}`);
    }

    if (process.env.YTDLP_COOKIES_BASE64) {
        try {
            const runtimeDir = join(backendRoot, '.runtime');
            mkdirSync(runtimeDir, { recursive: true });
            const runtimeCookiesPath = join(runtimeDir, 'youtube_cookies.txt');
            const decoded = Buffer.from(process.env.YTDLP_COOKIES_BASE64, 'base64').toString('utf-8');
            writeFileSync(runtimeCookiesPath, decoded, 'utf-8');
            return runtimeCookiesPath;
        } catch (error) {
            console.warn(`[yt-dlp] Failed to decode YTDLP_COOKIES_BASE64: ${error.message}`);
        }
    }

    return null;
}

const validCookiesPath = resolveCookiesPath();

function resolveYtDlpCommand() {
    if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
    if (existsSync(bundledYtDlpPath)) return bundledYtDlpPath;
    return 'yt-dlp';
}

const ytdlpCommand = resolveYtDlpCommand();

function buildBaseArgs() {
    const args = [
        '--no-playlist',
        '--js-runtimes', jsRuntimes,
        '--extractor-args', extractorArgs,
        '--retries', '3',
        '--fragment-retries', '3',
        '--sleep-requests', '1',
        '--sleep-interval', '1',
        '--max-sleep-interval', '5',
    ];

    if (process.env.YTDLP_PROXY) {
        args.push('--proxy', process.env.YTDLP_PROXY);
    }

    if (validCookiesPath) {
        args.push('--cookies', validCookiesPath);
    } else if (process.env.YTDLP_COOKIES_FROM_BROWSER) {
        args.push('--cookies-from-browser', process.env.YTDLP_COOKIES_FROM_BROWSER);
    }

    return args;
}

function spawnYtDlp(args) {
    return spawn(ytdlpCommand, args, { shell: false, windowsHide: true });
}

/**
 * Run yt-dlp with given args and collect stdout as a string.
 */
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const proc = spawnYtDlp(args);
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timeoutId = setTimeout(() => {
            if (settled) return;
            settled = true;
            proc.kill('SIGTERM');
            reject(new Error('yt-dlp timed out while fetching video info'));
        }, 60000);

        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        proc.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (err?.code === 'ENOENT') {
                reject(new Error('yt-dlp is not installed on server. Configure YTDLP_PATH or run setup-ytdlp during deploy.'));
                return;
            }
            reject(new Error(`Failed to start yt-dlp: ${err.message}`));
        });

        proc.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (code === 0) resolve(stdout.trim());
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        });
    });
}

/**
 * Fetch video metadata as JSON.
 * Returns: { id, title, thumbnail, duration, uploader, formats[] }
 */
export async function getVideoInfo(url) {
    const raw = await runYtDlp([...buildBaseArgs(), '--dump-json', url]);
    const data = JSON.parse(raw);

    // Build a clean list of available quality options
    const qualitySet = new Set();
    (data.formats || []).forEach((f) => {
        if (f.height) qualitySet.add(f.height);
    });

    const qualities = [...qualitySet]
        .filter((h) => [360, 480, 720, 1080, 1440, 2160].includes(h))
        .sort((a, b) => a - b)
        .map((h) => `${h}p`);

    return {
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        uploader: data.uploader,
        webpage_url: data.webpage_url,
        qualities: qualities.length ? qualities : ['360p', '720p', '1080p'],
        formats: ['mp4', 'mp3'],
    };
}

/**
 * Spawn yt-dlp as a streaming child process.
 * Pipes stdout directly to the Express response stream.
 *
 * @param {string} url   - YouTube URL
 * @param {string} format - 'mp4' | 'mp3'
 * @param {string} quality - e.g. '720' (just the number)
 * @param {function} onProgress - callback with percentage (0-100)
 * @returns {ChildProcess}
 */
export function spawnDownload(url, format, quality, onProgress) {
    const safeQuality = parseInt(quality, 10) || 720;

    let formatSelector;
    let extraArgs = [];

    if (format === 'mp3') {
        // Extract audio only, convert to mp3
        formatSelector = 'bestaudio/best';
        extraArgs = ['-x', '--audio-format', 'mp3', '--audio-quality', '0'];
    } else {
        // Prefer progressive mp4 to avoid requiring ffmpeg on minimal deploy environments
        formatSelector = `best[height<=${safeQuality}][ext=mp4]/best[height<=${safeQuality}]`;
    }

    const args = [
        ...buildBaseArgs(),
        '--newline', // Output progress on a new line
        '-f', formatSelector,
        ...extraArgs,
        '-o', '-',          // output to stdout
        '--no-part',
        '--no-mtime',
        url,
    ];

    const proc = spawnYtDlp(args);

    proc.on('error', (err) => {
        console.error('[yt-dlp spawn error]', err.message);
    });

    // Parse progress from stderr
    if (onProgress) {
        proc.stderr.on('data', (data) => {
            const line = data.toString();
            const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
                const percentage = parseFloat(match[1]);
                onProgress(percentage);
            }
        });
    }

    return proc;
}

export function normalizeYtDlpError(err) {
    const rawMessage = String(err?.message || 'Unknown yt-dlp error');
    const compactMessage = rawMessage.replace(/\s+/g, ' ').trim();

    if (/Sign in to confirm you.?re not a bot|Use --cookies/i.test(rawMessage)) {
        return {
            status: 429,
            error: 'YouTube requires additional verification for this request.',
            details: 'Server needs authenticated YouTube cookies. Set YTDLP_COOKIES_PATH on backend and redeploy.',
        };
    }

    if (/HTTP Error 429|Too Many Requests/i.test(rawMessage)) {
        return {
            status: 429,
            error: 'YouTube rate limit reached.',
            details: 'Please retry in a minute. If this persists, configure YTDLP_COOKIES_PATH and optionally YTDLP_PROXY.',
        };
    }

    if (/No supported JavaScript runtime/i.test(rawMessage)) {
        return {
            status: 500,
            error: 'Server yt-dlp runtime is incomplete.',
            details: 'Set YTDLP_JS_RUNTIMES=node in backend environment and redeploy.',
        };
    }

    if (/yt-dlp is not installed|spawn .*ENOENT|Failed to start yt-dlp/i.test(rawMessage)) {
        return {
            status: 500,
            error: 'yt-dlp is not available on backend.',
            details: 'Ensure postinstall runs setup-ytdlp and/or set YTDLP_PATH.',
        };
    }

    if (/ffmpeg|ffprobe/i.test(rawMessage)) {
        return {
            status: 500,
            error: 'ffmpeg is required for this format.',
            details: 'Install ffmpeg on backend or use MP4 progressive download.',
        };
    }

    return {
        status: 500,
        error: 'Failed to fetch video info',
        details: compactMessage,
    };
}

