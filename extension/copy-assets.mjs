/**
 * Post-build script: copies manifest.json and icons to dist/
 * Run automatically after `npm run build`
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src = (p) => resolve(__dirname, p);
const dist = (p) => resolve(__dirname, 'dist', p);

// Copy manifest.json
copyFileSync(src('manifest.json'), dist('manifest.json'));
console.log('✅ Copied manifest.json');

// Copy icons
const iconsDir = dist('icons');
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

const iconSizes = ['icon16.png', 'icon48.png', 'icon128.png'];
for (const icon of iconSizes) {
    const srcPath = src(`public/icons/${icon}`);
    if (existsSync(srcPath)) {
        copyFileSync(srcPath, dist(`icons/${icon}`));
        console.log(`✅ Copied ${icon}`);
    } else {
        console.warn(`⚠️  Missing icon: ${srcPath}`);
    }
}

console.log('🎉 Assets copied to dist/');
