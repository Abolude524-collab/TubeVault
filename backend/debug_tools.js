import { execSync } from 'child_process';

console.log('--- PATH CHECK ---');
console.log(process.env.PATH);

console.log('\n--- YT-DLP CHECK ---');
try {
    const ytdlp = execSync('where yt-dlp').toString();
    console.log('Location:', ytdlp);
    const version = execSync('yt-dlp --version').toString();
    console.log('Version:', version);
} catch (e) {
    console.log('yt-dlp NOT FOUND');
}

console.log('\n--- FFMPEG CHECK ---');
try {
    const ffmpeg = execSync('where ffmpeg').toString();
    console.log('Location:', ffmpeg);
    const version = execSync('ffmpeg -version').toString();
    console.log('Version (first line):', version.split('\n')[0]);
} catch (e) {
    console.log('ffmpeg NOT FOUND');
}
