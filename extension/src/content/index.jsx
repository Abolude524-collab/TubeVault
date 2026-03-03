import React from 'react';
import { createRoot } from 'react-dom/client';
import DownloadWidget from './DownloadWidget.jsx';

const WIDGET_ID = 'ytdl-widget-root';
const SHADOW_HOST_ID = 'ytdl-shadow-host';

let currentRoot = null;
let shadowHost = null;

/**
 * Find YouTube's action buttons row.
 * YouTube's DOM structure can vary; we try multiple selectors.
 */
function findActionsContainer() {
    return (
        document.querySelector('#actions-inner #top-level-buttons-computed') ||
        document.querySelector('#actions #top-level-buttons-computed') ||
        document.querySelector('ytd-watch-metadata #actions') ||
        document.querySelector('#above-the-fold #actions')
    );
}

/**
 * Mount the DownloadWidget into a Shadow DOM attached to the actions row.
 * Using Shadow DOM prevents YouTube's CSS from bleeding into our widget.
 */
function mountWidget() {
    // Only mount on video watch pages
    if (!window.location.href.includes('youtube.com/watch')) {
        unmountWidget();
        return;
    }

    const actionsContainer = findActionsContainer();
    if (!actionsContainer) return;

    // Don't double-mount
    if (document.getElementById(SHADOW_HOST_ID)) return;

    // Create shadow host element
    shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;';

    // Attach shadow root
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // Inject our scoped styles into shadow DOM
    const styleEl = document.createElement('style');
    styleEl.textContent = getWidgetStyles();
    shadowRoot.appendChild(styleEl);

    // Mount point for React
    const mountPoint = document.createElement('div');
    shadowRoot.appendChild(mountPoint);

    // Insert after the last button in the actions row
    actionsContainer.appendChild(shadowHost);

    // Mount React app
    currentRoot = createRoot(mountPoint);
    currentRoot.render(<DownloadWidget />);
}

function unmountWidget() {
    if (currentRoot) {
        currentRoot.unmount();
        currentRoot = null;
    }
    const existing = document.getElementById(SHADOW_HOST_ID);
    if (existing) existing.remove();
    shadowHost = null;
}

// ── SPA Navigation Handler ───────────────────────────────────────────────────
// YouTube fires 'yt-navigate-finish' on every client-side page transition.
// This is the most reliable hook for YouTube's SPA router.
window.addEventListener('yt-navigate-finish', () => {
    unmountWidget();
    // Give YouTube time to render the new page's DOM
    setTimeout(tryMount, 800);
});

// ── MutationObserver fallback ────────────────────────────────────────────────
// In case yt-navigate-finish fires before the actions row is in the DOM.
function tryMount(retries = 0) {
    if (findActionsContainer()) {
        mountWidget();
    } else if (retries < 15) {
        setTimeout(() => tryMount(retries + 1), 300);
    }
}

// ── Initial mount ────────────────────────────────────────────────────────────
// Wait for the page to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tryMount());
} else {
    tryMount();
}

// ── Scoped styles (injected into Shadow DOM) ─────────────────────────────────
function getWidgetStyles() {
    return `
    * { box-sizing: border-box; font-family: "Roboto", "Arial", sans-serif; }

    .ytdl-widget {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    /* ── Main button ── */
    .ytdl-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 16px;
      height: 36px;
      border-radius: 18px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.01em;
      transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      white-space: nowrap;
      outline: none;
      background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(255, 0, 0, 0.35);
    }

    .ytdl-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff2222 0%, #dd0000 100%);
      box-shadow: 0 4px 16px rgba(255, 0, 0, 0.5);
      transform: translateY(-1px);
    }

    .ytdl-btn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(255, 0, 0, 0.3);
    }

    .ytdl-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .ytdl-btn--done {
      background: linear-gradient(135deg, #00c853 0%, #009624 100%);
      box-shadow: 0 2px 8px rgba(0, 200, 83, 0.35);
    }

    .ytdl-btn--error {
      background: linear-gradient(135deg, #ff6d00 0%, #e65100 100%);
      box-shadow: 0 2px 8px rgba(255, 109, 0, 0.35);
    }

    .ytdl-btn__icon {
      display: flex;
      align-items: center;
    }

    .ytdl-btn__label {
      line-height: 1;
    }

    /* ── Spinner animation ── */
    .ytdl-spinner {
      animation: ytdl-spin 0.8s linear infinite;
    }

    @keyframes ytdl-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* ── Dropdown panel ── */
    .ytdl-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      z-index: 9999;
      min-width: 260px;
      background: #212121;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
      animation: ytdl-fadeIn 0.15s ease;
    }

    @keyframes ytdl-fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ytdl-dropdown__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .ytdl-dropdown__title {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
      line-height: 1.3;
      flex: 1;
    }

    .ytdl-dropdown__duration {
      font-size: 12px;
      color: #aaa;
      white-space: nowrap;
      background: rgba(255,255,255,0.08);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .ytdl-dropdown__row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .ytdl-label {
      font-size: 12px;
      color: #aaa;
      min-width: 50px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Pills ── */
    .ytdl-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ytdl-pill {
      padding: 4px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.15);
      background: transparent;
      color: #ccc;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ytdl-pill:hover {
      border-color: rgba(255,255,255,0.35);
      color: #fff;
      background: rgba(255,255,255,0.08);
    }

    .ytdl-pill--active {
      background: linear-gradient(135deg, #ff0000, #cc0000);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 2px 8px rgba(255,0,0,0.3);
    }

    /* ── Download action button ── */
    .ytdl-download-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-top: 14px;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(255,0,0,0.3);
    }

    .ytdl-download-btn:hover {
      background: linear-gradient(135deg, #ff2222 0%, #dd0000 100%);
      box-shadow: 0 4px 16px rgba(255,0,0,0.5);
      transform: translateY(-1px);
    }

    .ytdl-download-btn:active {
      transform: translateY(0);
    }
  `;
}
