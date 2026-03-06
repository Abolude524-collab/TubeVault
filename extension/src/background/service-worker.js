const BACKEND_URL = 'https://tubevault-t551.onrender.com';

// ── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'FETCH_INFO') {
        handleFetchInfo(message.url).then(sendResponse).catch((err) => {
            sendResponse({ error: err.message });
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'START_DOWNLOAD') {
        const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        handleStartDownload({ ...message, id }).then(res => sendResponse({ ...res, id })).catch((err) => {
            sendResponse({ error: err.message });
        });
        return true;
    }

    if (message.type === 'GET_HISTORY') {
        chrome.storage.local.get(['downloadHistory'], (result) => {
            sendResponse({ history: result.downloadHistory || [] });
        });
        return true;
    }

    // Add progress polling support
    if (message.type === 'GET_PROGRESS') {
        fetch(`${BACKEND_URL}/api/progress?id=${message.id}`)
            .then(res => res.json())
            .then(sendResponse)
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }
});

// ── Fetch video info from backend ────────────────────────────────────────────
async function handleFetchInfo(url) {
    const res = await fetch(`${BACKEND_URL}/api/info?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Backend error ${res.status}`);
    }
    return res.json();
}

// ── Trigger download via chrome.downloads API ────────────────────────────────
async function handleStartDownload({ url, format, quality, title, id }) {
    const downloadUrl = `${BACKEND_URL}/api/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}&id=${id}`;


    return new Promise((resolve, reject) => {
        chrome.downloads.download(
            {
                url: downloadUrl,
                filename: sanitizeFilename(`${title}.${format}`),
                saveAs: false,
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }

                // Save to local history
                saveToHistory({ title, url, format, quality, downloadId });
                resolve({ downloadId, status: 'started' });
            }
        );
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').slice(0, 120);
}

async function saveToHistory(entry) {
    const result = await chrome.storage.local.get(['downloadHistory']);
    const history = result.downloadHistory || [];
    history.unshift({ ...entry, downloadedAt: new Date().toISOString() });
    // Keep last 50 entries
    chrome.storage.local.set({ downloadHistory: history.slice(0, 50) });
}
