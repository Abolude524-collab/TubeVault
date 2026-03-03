import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = 'http://localhost:3001';

const QUALITIES = ['360p', '480p', '720p', '1080p'];
const FORMATS = ['mp4', 'mp3'];

// Status types
const STATUS = {
    IDLE: 'idle',
    LOADING_INFO: 'loading_info',
    READY: 'ready',
    DOWNLOADING: 'downloading',
    DONE: 'done',
    ERROR: 'error',
};

export default function DownloadWidget() {
    const [status, setStatus] = useState(STATUS.IDLE);
    const [videoInfo, setVideoInfo] = useState(null);
    const [selectedQuality, setSelectedQuality] = useState('720p');
    const [selectedFormat, setSelectedFormat] = useState('mp4');
    const [errorMsg, setErrorMsg] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const currentUrl = window.location.href;

    // Reset when URL changes (SPA navigation handled in index.jsx, but also reset state here)
    useEffect(() => {
        setStatus(STATUS.IDLE);
        setVideoInfo(null);
        setErrorMsg('');
        setShowDropdown(false);
    }, [currentUrl]);

    const fetchInfo = useCallback(async () => {
        setStatus(STATUS.LOADING_INFO);
        setErrorMsg('');
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'FETCH_INFO', url: currentUrl },
                    (res) => {
                        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                        if (res?.error) return reject(new Error(res.error));
                        resolve(res);
                    }
                );
            });
            setVideoInfo(response);
            // Pick best available quality
            const available = response.qualities || QUALITIES;
            if (!available.includes(selectedQuality)) {
                setSelectedQuality(available[available.length - 1] || '720p');
            }
            setStatus(STATUS.READY);
            setShowDropdown(true);
        } catch (err) {
            setErrorMsg(err.message || 'Failed to fetch video info');
            setStatus(STATUS.ERROR);
        }
    }, [currentUrl, selectedQuality]);

    const startDownload = useCallback(async () => {
        if (!videoInfo) return;
        setStatus(STATUS.DOWNLOADING);
        setShowDropdown(false);
        const quality = selectedQuality.replace('p', '');
        try {
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        type: 'START_DOWNLOAD',
                        url: currentUrl,
                        format: selectedFormat,
                        quality,
                        title: videoInfo.title,
                    },
                    (res) => {
                        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                        if (res?.error) return reject(new Error(res.error));
                        resolve(res);
                    }
                );
            });
            setStatus(STATUS.DONE);
            // Reset after 3s
            setTimeout(() => setStatus(STATUS.IDLE), 3000);
        } catch (err) {
            setErrorMsg(err.message || 'Download failed');
            setStatus(STATUS.ERROR);
        }
    }, [videoInfo, currentUrl, selectedFormat, selectedQuality]);

    const handleButtonClick = () => {
        if (status === STATUS.IDLE || status === STATUS.ERROR) {
            fetchInfo();
        } else if (status === STATUS.READY) {
            setShowDropdown((v) => !v);
        }
    };

    const isVideoPage = currentUrl.includes('youtube.com/watch');
    if (!isVideoPage) return null;

    return (
        <div className="ytdl-widget" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            {/* Main Download Button */}
            <button
                className={`ytdl-btn ytdl-btn--${status}`}
                onClick={handleButtonClick}
                disabled={status === STATUS.LOADING_INFO || status === STATUS.DOWNLOADING}
                title={
                    status === STATUS.DONE
                        ? 'Download started!'
                        : status === STATUS.ERROR
                            ? errorMsg
                            : 'Download video'
                }
            >
                <span className="ytdl-btn__icon">{getIcon(status)}</span>
                <span className="ytdl-btn__label">{getLabel(status)}</span>
            </button>

            {/* Dropdown Panel */}
            {showDropdown && status === STATUS.READY && (
                <div className="ytdl-dropdown">
                    <div className="ytdl-dropdown__header">
                        <span className="ytdl-dropdown__title" title={videoInfo?.title}>
                            {truncate(videoInfo?.title || 'Video', 40)}
                        </span>
                        {videoInfo?.duration && (
                            <span className="ytdl-dropdown__duration">{formatDuration(videoInfo.duration)}</span>
                        )}
                    </div>

                    <div className="ytdl-dropdown__row">
                        <label className="ytdl-label">Format</label>
                        <div className="ytdl-pills">
                            {FORMATS.map((f) => (
                                <button
                                    key={f}
                                    className={`ytdl-pill ${selectedFormat === f ? 'ytdl-pill--active' : ''}`}
                                    onClick={() => setSelectedFormat(f)}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedFormat === 'mp4' && (
                        <div className="ytdl-dropdown__row">
                            <label className="ytdl-label">Quality</label>
                            <div className="ytdl-pills">
                                {(videoInfo?.qualities || QUALITIES).map((q) => (
                                    <button
                                        key={q}
                                        className={`ytdl-pill ${selectedQuality === q ? 'ytdl-pill--active' : ''}`}
                                        onClick={() => setSelectedQuality(q)}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button className="ytdl-download-btn" onClick={startDownload}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                        Download {selectedFormat === 'mp4' ? `${selectedQuality} MP4` : 'MP3'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getIcon(status) {
    switch (status) {
        case STATUS.LOADING_INFO:
            return <SpinnerIcon />;
        case STATUS.DOWNLOADING:
            return <SpinnerIcon />;
        case STATUS.DONE:
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
            );
        case STATUS.ERROR:
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
            );
        default:
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            );
    }
}

function getLabel(status) {
    switch (status) {
        case STATUS.LOADING_INFO:
            return 'Loading...';
        case STATUS.READY:
            return 'Download';
        case STATUS.DOWNLOADING:
            return 'Downloading...';
        case STATUS.DONE:
            return 'Done!';
        case STATUS.ERROR:
            return 'Retry';
        default:
            return 'Download';
    }
}

function SpinnerIcon() {
    return (
        <svg className="ytdl-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
    );
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}
