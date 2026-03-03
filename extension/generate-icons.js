/**
 * Generates simple red PNG icons for the Chrome extension.
 * Uses raw PNG binary generation — no external dependencies needed.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createPNG(size) {
    // PNG signature
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    function chunk(type, data) {
        const typeBytes = Buffer.from(type, 'ascii');
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const crcData = Buffer.concat([typeBytes, data]);
        const crc = Buffer.alloc(4);
        crc.writeInt32BE(crc32(crcData));
        return Buffer.concat([len, typeBytes, data, crc]);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: RGB
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    // Build raw pixel data (RGBA)
    const rows = [];
    for (let y = 0; y < size; y++) {
        const row = Buffer.alloc(1 + size * 3); // filter byte + RGB
        row[0] = 0; // no filter
        for (let x = 0; x < size; x++) {
            // Red background
            let r = 204, g = 0, b = 0;

            // Draw a simple download arrow (white)
            const cx = size / 2;
            const cy = size / 2;
            const norm_x = (x - cx) / (size * 0.35);
            const norm_y = (y - cy) / (size * 0.35);

            // Arrow shaft: vertical line
            if (Math.abs(norm_x) < 0.12 && norm_y > -0.7 && norm_y < 0.2) {
                r = 255; g = 255; b = 255;
            }
            // Arrow head: triangle
            if (norm_y > 0.1 && norm_y < 0.55 && Math.abs(norm_x) < (0.55 - norm_y) * 1.2) {
                r = 255; g = 255; b = 255;
            }
            // Bottom bar
            if (norm_y > 0.6 && norm_y < 0.85 && Math.abs(norm_x) < 0.65) {
                r = 255; g = 255; b = 255;
            }

            row[1 + x * 3] = r;
            row[1 + x * 3 + 1] = g;
            row[1 + x * 3 + 2] = b;
        }
        rows.push(row);
    }

    const rawData = Buffer.concat(rows);
    const compressed = zlib.deflateSync(rawData);

    const idat = chunk('IDAT', compressed);
    const iend = chunk('IEND', Buffer.alloc(0));

    return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

// Simple CRC32
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = makeCRCTable();
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) | 0;
}

function makeCRCTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c;
    }
    return table;
}

// Generate icons
const iconsDir = resolve(__dirname, 'public', 'icons');
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
    const png = createPNG(size);
    const outPath = resolve(iconsDir, `icon${size}.png`);
    writeFileSync(outPath, png);
    console.log(`✅ Created icon${size}.png (${png.length} bytes)`);
}

console.log('🎉 Icons generated!');
