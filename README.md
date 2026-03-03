# YT Downloader

A high-performance YouTube Video & Music Downloader consisting of:

- **Chrome/Edge Extension** (React + Vite, Manifest V3) — injects a premium download button directly into YouTube's UI
- **Node.js/Express Backend** — wraps `yt-dlp` to fetch metadata and stream downloads
- **MongoDB** (optional) — stores download history

---

## Prerequisites

Before running, make sure you have:

| Tool | Install |
|------|---------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **yt-dlp** | `pip install yt-dlp` or [GitHub releases](https://github.com/yt-dlp/yt-dlp/releases) |
| **ffmpeg** | [ffmpeg.org](https://ffmpeg.org/download.html) — add to PATH |

Verify: `yt-dlp --version` and `ffmpeg -version`

---

## Project Structure

```
gemini-hack/
├── extension/          ← Chrome Extension (React + Vite)
│   ├── src/
│   │   ├── background/service-worker.js   ← message routing
│   │   ├── content/
│   │   │   ├── index.jsx                  ← YouTube DOM injection + SPA nav
│   │   │   └── DownloadWidget.jsx         ← Download button UI
│   │   └── popup/
│   │       ├── Popup.jsx                  ← Extension popup
│   │       └── main.jsx
│   ├── manifest.json
│   └── vite.config.js
│
└── backend/            ← Node.js + Express
    ├── src/
    │   ├── routes/info.js                 ← GET /api/info
    │   ├── routes/download.js             ← GET /api/download (streaming)
    │   ├── services/ytdlp.js              ← yt-dlp wrapper
    │   └── models/Download.js             ← Mongoose schema
    └── .env
```

---

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
# → Running at http://localhost:3001
```

### 2. Build the Extension

```bash
cd extension
npm install
npm run build
# → Output in extension/dist/
```

### 3. Load in Chrome/Edge

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder
5. Navigate to any YouTube video — the **Download** button appears!

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/info?url=<yt-url>` | Fetch video metadata + available formats |
| `GET` | `/api/download?url=<yt-url>&format=mp4&quality=720` | Stream download |
| `GET` | `/health` | Backend health check |

---

## How It Works

```
YouTube Page
    │  yt-navigate-finish (SPA nav)
    ▼
Content Script (index.jsx)
    │  Injects <DownloadWidget> into YouTube's #actions row (Shadow DOM)
    │  User clicks Download → selects quality/format
    │
    │  chrome.runtime.sendMessage(FETCH_INFO)
    ▼
Service Worker (service-worker.js)
    │  fetch() → http://localhost:3001/api/info
    ▼
Backend (Express + yt-dlp)
    │  yt-dlp --dump-json → returns metadata
    │
    │  chrome.downloads.download(downloadUrl)
    ▼
Browser downloads the file
    (Backend streams yt-dlp stdout → HTTP response)
```

---

## Features

- ✅ **One-click download** button injected into YouTube's native UI
- ✅ **Format selection**: MP4 (video) or MP3 (audio)
- ✅ **Quality selection**: 360p, 480p, 720p, 1080p
- ✅ **DASH stream merging**: yt-dlp + ffmpeg merge separate audio/video streams
- ✅ **SPA navigation**: button re-appears on every new video (via `yt-navigate-finish`)
- ✅ **Shadow DOM**: widget styles are fully isolated from YouTube's CSS
- ✅ **Download history**: stored in `chrome.storage.local` + MongoDB
- ✅ **Backend status indicator** in extension popup

---

## MongoDB (Optional)

If you want download history persisted to MongoDB, set `MONGODB_URI` in `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/yt-downloader
```

If not set, the backend runs fine without it (history is still stored locally in the extension).
"# TubeVault" 
