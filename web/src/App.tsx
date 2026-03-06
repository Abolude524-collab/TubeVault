import { useState, useRef } from 'react';

import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://tubevault-t551.onrender.com');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || (import.meta.env.DEV ? 20000 : 90000));


interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  uploader: string;
  duration: number;
  qualities: string[];
}

const Navbar = () => {
  return (
    <header className="w-full max-w-7xl mx-auto px-6 py-7 flex items-center justify-between z-10 relative">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-full btn-gradient flex items-center justify-center text-white shadow-lg shadow-fuchsia-900/30">
          <span className="material-symbols-outlined text-[18px] font-bold">play_arrow</span>
        </div>
        <h1 className="text-[30px] font-bold tracking-[-0.04em] text-white">TubeVault</h1>
      </div>
      <nav className="hidden md:flex items-center gap-10">
        <a className="text-[13px] font-medium text-[#9aa0b6] hover:text-white transition-colors" href="#features">Features</a>
        <a className="text-[13px] font-medium text-[#9aa0b6] hover:text-white transition-colors" href="#">Pro Plan</a>
        <a className="text-[13px] font-medium text-[#9aa0b6] hover:text-white transition-colors" href="#">API</a>
        <button className="px-5 py-2.5 rounded-2xl bg-[#1a1322] text-white text-[13px] font-semibold hover:bg-[#24172f] transition-all border border-white/10">
          Sign In
        </button>
      </nav>
    </header>
  );
};

const FeatureCard = ({ icon, title, description, iconClass }: { icon: string, title: string, description: string, iconClass: string }) => (
  <div className="group p-8 rounded-2xl border border-white/6 bg-[#180817]/65 hover:bg-[#1f0a1e]/70 transition-all duration-300">
    <div className={`size-11 rounded-full flex items-center justify-center mb-6 ${iconClass}`}>
      <span className="material-symbols-outlined text-[18px] text-white">{icon}</span>
    </div>
    <h3 className="text-[36px] font-bold mb-3 text-white tracking-[-0.03em]">{title}</h3>
    <p className="text-[#a3a0b4] leading-relaxed text-[16px]">{description}</p>
  </div>
);

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMode, setToastMode] = useState<'started' | 'done'>('done');

  const resultRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const triggerToast = (mode: 'started' | 'done', durationMs = 5000) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMode(mode);
    setShowToast(true);
    toastTimerRef.current = window.setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, durationMs);
  };

  const fetchWithTimeout = async (resource: string, timeoutMs = REQUEST_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(resource, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    try {
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        let message = 'Failed to fetch video info';
        try {
          const payload = await response.json();
          message = payload?.details || payload?.error || message;
        } catch {
          // ignore JSON parse errors and keep default message
        }
        throw new Error(message);
      }
      const data = await response.json();
      setVideoInfo(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Request timed out. Please check backend connection and try again.');
      } else {
        setError(err.message || 'Failed to fetch video info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string, quality: string) => {
    const downloadId = crypto.randomUUID();
    setDownloadProgress(0);

    // Start the download (this initiates the stream but we don't wait for it to finish here for progress)
    const downloadUrl = `${BACKEND_URL}/api/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality.replace('p', '')}&id=${downloadId}`;

    // Trigger download in browser
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('started', 3500);

    // Poll for progress
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/progress?id=${downloadId}`);
        const data = await res.json();

        if (data.status === 'downloading' || data.status === 'done') {
          setDownloadProgress(Math.round(data.progress));
        }

        if (data.status === 'done' || data.status === 'error') {
          clearInterval(pollInterval);
          if (data.status === 'done') {
            setDownloadProgress(100);
            setTimeout(() => {
              setDownloadProgress(null);
              triggerToast('done', 5000);
            }, 1000);
          } else {
            setError('Download failed on server');
            setDownloadProgress(null);
          }
        }
      } catch (err) {
        console.error('Progress polling error:', err);
      }
    }, 1000);
  };


  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden text-white font-inter bg-[#09000d]">
      <div className="mesh-gradient" />
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-secondary z-60 origin-left" style={{ scaleX }} />


      <Navbar />

      <main className="grow flex flex-col items-center justify-center px-6 pt-24 pb-10 md:pt-28 md:pb-14 z-10 relative">
        <div className="max-w-4xl w-full text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-400 text-[11px] font-bold uppercase tracking-[0.18em]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Now supporting 8K resolution
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[66px] md:text-[86px] font-black tracking-[-0.045em] text-white leading-[0.98]"
          >
            Download YouTube <br />
            <span className="text-transparent bg-clip-text hero-gradient-text">Videos in Seconds</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[30px] md:text-[34px] text-[#8f93a8] max-w-3xl mx-auto leading-[1.4] font-medium"
          >
            Experience the fastest way to save high-quality content for offline viewing. No ads, no limits, just pure speed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-4xl mx-auto mt-10 p-2 rounded-2xl bg-[#170b1b]/90 border border-white/8 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.8)] focus-glow transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative grow flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-fuchsia-400/80 text-[20px]">link</span>
                <input
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 text-white placeholder:text-[#6f6f83] font-medium text-[18px]"
                  placeholder="Paste YouTube video URL here..."
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                />
              </div>
              <button
                onClick={fetchInfo}
                disabled={loading || !url}
                className="btn-gradient text-white px-9 py-4 rounded-[14px] font-bold flex items-center justify-center gap-2 text-[18px] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_20px_rgba(190,24,93,0.35)] disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin material-symbols-outlined">sync</span>
                ) : (
                  <>
                    <span>Download</span>
                    <span className="material-symbols-outlined text-xl">download</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined">error</span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap justify-center gap-8 md:gap-[4.5rem] pt-9 opacity-70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-fuchsia-500/80 text-[17px]">verified</span>
              <span className="text-[16px] font-semibold uppercase tracking-[0.14em] text-[#7f8193]">Safe & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-fuchsia-500/80 text-[17px]">bolt</span>
              <span className="text-[16px] font-semibold uppercase tracking-[0.14em] text-[#7f8193]">Instant Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-fuchsia-500/80 text-[17px]">hd</span>
              <span className="text-[16px] font-semibold uppercase tracking-[0.14em] text-[#7f8193]">4K & 8K Support</span>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {videoInfo && !loading && (
          <motion.section
            ref={resultRef}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-6 py-10 w-full"
          >
            <div className="glass-card p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden border border-white/8 bg-[#15091a]/80">
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">Verified</span>
              </div>
              <img src={videoInfo.thumbnail} className="w-full md:w-64 aspect-video object-cover rounded-2xl shadow-2xl" alt="" />
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-black leading-tight">{videoInfo.title}</h3>
                <div className="flex items-center justify-center md:justify-start gap-4 text-slate-400 text-sm font-bold">
                  <span>{videoInfo.uploader}</span>
                  <span>•</span>
                  <span>{formatDuration(videoInfo.duration)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                  {(videoInfo.qualities || ['360p', '720p', '1080p']).map(q => (
                    <button
                      key={q}
                      onClick={() => handleDownload('mp4', q)}
                      className="bg-[#281b2a] hover:bg-[#332237] text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-white/10"
                    >
                      {q} <span className="material-symbols-outlined text-sm">video_library</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleDownload('mp3', '0')}
                    className="col-span-full bg-primary/10 hover:bg-primary/20 text-primary py-3 rounded-xl text-sm font-black border border-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    MP3 High Bitrate <span className="material-symbols-outlined text-sm">music_note</span>
                  </button>
                </div>

              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {downloadProgress !== null && (
          <motion.section
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-2xl mx-auto px-6 pb-24 w-full"
          >
            <div className="p-6 rounded-2xl border border-white/10 bg-[#1a0b1c]/70 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-2.5 bg-fuchsia-500 rounded-full animate-pulse" />
                  <span className="text-[14px] font-semibold text-white">Processing: "{videoInfo?.title.substring(0, 20)}..."</span>
                </div>
                <span className="text-xs font-mono text-fuchsia-400">{downloadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#3a2a3f] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  className="h-full btn-gradient rounded-full"
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#71667b] text-center">Fetching 4K Stream • Transmuxing to MP4</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard icon="bolt" iconClass="bg-fuchsia-600/20 text-fuchsia-300" title="Fast Downloads" description="Our multi-threaded engine splits files into smaller chunks, allowing you to download videos up to 10x faster than standard tools." />
          <FeatureCard icon="video_library" iconClass="bg-violet-600/20 text-violet-300" title="High Quality (MP4/MP3)" description="Download in pristine 4K resolution or extract high-bitrate 320kbps MP3 audio with crystal clear metadata and covers." />
          <FeatureCard icon="shield" iconClass="bg-emerald-600/20 text-emerald-300" title="Secure & Private" description="We don't track your history or store your IP. All processing is transient and encrypted with bank-grade security protocols." />
        </div>
      </section>

      

      <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <div className="relative overflow-hidden rounded-[26px] cta-gradient p-14 text-center text-white border border-white/12">
          <h3 className="text-[54px] font-bold mb-5 relative z-10 tracking-[-0.03em]">Ready to save your favorite content?</h3>
          <p className="text-white/85 mb-9 max-w-3xl mx-auto relative z-10 text-[20px] leading-relaxed">Join over 50,000 creators and researchers who use TubeVault for their high-quality archival needs.</p>
          <button className="bg-white text-fuchsia-600 px-11 py-4 rounded-full font-black uppercase tracking-[0.08em] hover:bg-slate-100 transition-colors relative z-10 text-[17px]">Get Started Now</button>
        </div>
      </section>

      <footer className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-white/8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 opacity-55">
          <span className="material-symbols-outlined text-sm">play_circle</span>
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7f7a8f]">TubeVault © 2024</span>
        </div>
        <p className="text-[12px] text-[#7f7a8f] max-w-xl text-center">
          Premium tool for researchers and content creators. Use responsibly. Respect creator copyrights and fair use guidelines.
        </p>
        <div className="flex gap-6">
          <a className="text-[12px] font-medium text-[#7f7a8f] hover:text-white transition-colors" href="#">Privacy</a>
          <a className="text-[12px] font-medium text-[#7f7a8f] hover:text-white transition-colors" href="#">Terms</a>
          <a className="text-[12px] font-medium text-[#7f7a8f] hover:text-white transition-colors" href="#">Contact</a>
        </div>
      </footer>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <div className="flex items-center gap-4 bg-[#180f1f] border border-white/10 p-4 rounded-2xl shadow-2xl animate-bounce-subtle">
              <div className={`size-8 rounded-full flex items-center justify-center ${toastMode === 'done' ? 'bg-green-500/20 text-green-500' : 'bg-sky-500/20 text-sky-400'}`}>
                <span className="material-symbols-outlined text-sm">{toastMode === 'done' ? 'check' : 'download'}</span>
              </div>
              <div>
                <p className="text-xs font-bold">{toastMode === 'done' ? 'Download Ready!' : 'Download Started'}</p>
                <p className="text-[10px] text-slate-400">{toastMode === 'done' ? 'Your high-quality file is ready.' : 'Your video is now downloading in the background.'}</p>
              </div>
              <button
                onClick={() => {
                  if (toastTimerRef.current) {
                    window.clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = null;
                  }
                  setShowToast(false);
                }}
                className="text-slate-500 hover:text-white ml-2"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
