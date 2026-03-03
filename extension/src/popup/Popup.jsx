import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:3001';

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, max) {
    return str && str.length > max ? str.slice(0, max) + '…' : str;
}

export default function Popup() {
    const [history, setHistory] = useState([]);
    const [backendStatus, setBackendStatus] = useState('checking'); // 'ok' | 'error' | 'checking'
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'settings'
    const [backendUrl, setBackendUrl] = useState(BACKEND_URL);

    useEffect(() => {
        // Load history from chrome.storage
        chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (res) => {
            if (res?.history) setHistory(res.history);
        });

        // Check backend health
        chrome.storage.local.get(['backendUrl'], (result) => {
            const url = result.backendUrl || BACKEND_URL;
            setBackendUrl(url);
            fetch(`${url}/health`)
                .then((r) => r.ok ? setBackendStatus('ok') : setBackendStatus('error'))
                .catch(() => setBackendStatus('error'));
        });
    }, []);

    const saveBackendUrl = () => {
        chrome.storage.local.set({ backendUrl });
        setBackendStatus('checking');
        fetch(`${backendUrl}/health`)
            .then((r) => r.ok ? setBackendStatus('ok') : setBackendStatus('error'))
            .catch(() => setBackendStatus('error'));
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logo}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff0000">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.title}>YT Downloader</div>
                        <div style={styles.subtitle}>v1.0.0</div>
                    </div>
                </div>
                <div style={{ ...styles.statusBadge, background: backendStatus === 'ok' ? '#00c853' : backendStatus === 'error' ? '#ff3d00' : '#ffa000' }}>
                    <div style={styles.statusDot} />
                    {backendStatus === 'ok' ? 'Online' : backendStatus === 'error' ? 'Offline' : '...'}
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                {['history', 'settings'].map((tab) => (
                    <button
                        key={tab}
                        style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={styles.content}>
                {activeTab === 'history' && (
                    <>
                        {history.length === 0 ? (
                            <div style={styles.empty}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="#444">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                </svg>
                                <p style={styles.emptyText}>No downloads yet</p>
                                <p style={styles.emptySubtext}>Navigate to a YouTube video and click the Download button</p>
                            </div>
                        ) : (
                            <div style={styles.historyList}>
                                {history.map((item, i) => (
                                    <div key={i} style={styles.historyItem}>
                                        {item.thumbnail && (
                                            <img src={item.thumbnail} alt="" style={styles.thumbnail} />
                                        )}
                                        <div style={styles.historyInfo}>
                                            <div style={styles.historyTitle}>{truncate(item.title, 45)}</div>
                                            <div style={styles.historyMeta}>
                                                <span style={{ ...styles.badge, background: item.format === 'mp3' ? '#7c4dff' : '#0288d1' }}>
                                                    {item.format?.toUpperCase()}
                                                </span>
                                                {item.quality && item.format !== 'mp3' && (
                                                    <span style={{ ...styles.badge, background: '#37474f' }}>{item.quality}</span>
                                                )}
                                                <span style={styles.historyDate}>{formatDate(item.downloadedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'settings' && (
                    <div style={styles.settings}>
                        <div style={styles.settingRow}>
                            <label style={styles.settingLabel}>Backend URL</label>
                            <div style={styles.settingInputRow}>
                                <input
                                    style={styles.input}
                                    value={backendUrl}
                                    onChange={(e) => setBackendUrl(e.target.value)}
                                    placeholder="http://localhost:3001"
                                />
                                <button style={styles.saveBtn} onClick={saveBackendUrl}>Save</button>
                            </div>
                            <p style={styles.settingHint}>
                                The local Node.js backend URL. Make sure it's running with <code style={styles.code}>npm run dev</code>.
                            </p>
                        </div>

                        <div style={styles.infoBox}>
                            <p style={styles.infoTitle}>Requirements</p>
                            <ul style={styles.infoList}>
                                <li>✅ Node.js backend running on port 3001</li>
                                <li>✅ yt-dlp installed and in PATH</li>
                                <li>✅ ffmpeg installed and in PATH</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
    container: {
        width: 340,
        minHeight: 200,
        background: '#0f0f0f',
        color: '#fff',
        fontFamily: '"Roboto", "Arial", sans-serif',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    logo: {
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,0,0,0.2)',
    },
    title: { fontSize: 15, fontWeight: 700, color: '#fff' },
    subtitle: { fontSize: 11, color: '#666' },
    statusBadge: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 10,
        fontSize: 11, fontWeight: 600, color: '#fff',
    },
    statusDot: { width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)' },
    tabs: {
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#111',
    },
    tab: {
        flex: 1, padding: '10px', border: 'none',
        background: 'transparent', color: '#888',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        transition: 'color 0.15s',
    },
    tabActive: {
        color: '#ff0000',
        borderBottom: '2px solid #ff0000',
    },
    content: { flex: 1, overflow: 'auto' },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 20px', gap: 8,
    },
    emptyText: { fontSize: 14, fontWeight: 500, color: '#666' },
    emptySubtext: { fontSize: 12, color: '#444', textAlign: 'center', lineHeight: 1.4 },
    historyList: { padding: '8px 0' },
    historyItem: {
        display: 'flex', gap: 10, padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.15s',
    },
    thumbnail: { width: 64, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 },
    historyInfo: { flex: 1, minWidth: 0 },
    historyTitle: { fontSize: 12, fontWeight: 500, color: '#eee', lineHeight: 1.3, marginBottom: 5 },
    historyMeta: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    badge: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: '#fff' },
    historyDate: { fontSize: 10, color: '#555' },
    settings: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
    settingRow: { display: 'flex', flexDirection: 'column', gap: 6 },
    settingLabel: { fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' },
    settingInputRow: { display: 'flex', gap: 8 },
    input: {
        flex: 1, padding: '8px 10px', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.12)',
        background: '#1a1a1a', color: '#fff', fontSize: 12, outline: 'none',
    },
    saveBtn: {
        padding: '8px 14px', borderRadius: 6, border: 'none',
        background: 'linear-gradient(135deg, #ff0000, #cc0000)',
        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    },
    settingHint: { fontSize: 11, color: '#555', lineHeight: 1.4 },
    code: { background: '#1a1a1a', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' },
    infoBox: {
        background: '#1a1a1a', borderRadius: 8,
        padding: 12, border: '1px solid rgba(255,255,255,0.06)',
    },
    infoTitle: { fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 8 },
    infoList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 },
};
