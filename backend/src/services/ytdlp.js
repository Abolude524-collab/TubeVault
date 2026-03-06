import { spawn } from 'child_process';

/**
 * Run yt-dlp with given args and collect stdout as a string.
 */
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('yt-dlp', args, { shell: false, windowsHide: true });
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
    const raw = await runYtDlp(['--dump-json', '--no-playlist', url]);
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
        // Merge best video up to requested height with best audio → mp4
        formatSelector = `bestvideo[height<=${safeQuality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${safeQuality}]+bestaudio/best[height<=${safeQuality}]`;
        extraArgs = ['--merge-output-format', 'mp4'];
    }

    const args = [
        '--no-playlist',
        '--newline', // Output progress on a new line
        '-f', formatSelector,
        ...extraArgs,
        '-o', '-',          // output to stdout
        '--no-part',
        '--no-mtime',
        url,
    ];

    const proc = spawn('yt-dlp', args, { shell: false, windowsHide: true });

    // Parse progress from stderr
    if (onProgress) {
        proc.stderr.on('data', (data) => {
            const line = data.toString();
            const match = line.match(/\[download\]\s+(\d+\.\d+)%/);
            if (match) {
                const percentage = parseFloat(match[1]);
                onProgress(percentage);
            }
        });
    }

    return proc;
}

