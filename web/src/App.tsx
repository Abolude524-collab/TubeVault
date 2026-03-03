import { useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Download, Music, Video, Youtube, Search, Loader2, ArrowRight,
  Play, CheckCircle2, AlertCircle, Shield, Zap, Globe, Github,
  Twitter, Menu, X, Layers, Smartphone
} from 'lucide-react';

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  uploader: string;
  duration: number;
  qualities: string[];
}

const FloatingObject = ({ delay = 0, size = "w-20 h-20", color = "bg-purple-500/20", shape = "rounded-full", className = "" }: { delay?: number, size?: string, color?: string, shape?: string, className?: string }) => (
  <motion.div
    initial={{ y: 0, rotate: 0, opacity: 0 }}
    animate={{
      y: [-20, 20, -20],
      rotate: [0, 90, 180, 270, 360],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      delay,
      ease: "linear"
    }}
    className={`absolute blur-3xl shadow-2xl ${size} ${color} ${shape} ${className} -z-10`}
  />
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 p-4">
      <div className="max-w-7xl mx-auto glass rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-500 p-2 rounded-lg text-white">
            <Youtube size={20} />
          </div>
          <span className="text-xl font-bold tracking-tighter">YT <span className="text-primary">Downloader</span></span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</a>
          <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
          <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-bold border border-white/10 transition-all">
            Get Started
          </button>
        </div>

        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden mt-2 glass rounded-2xl p-6 flex flex-col gap-4"
          >
            <a href="#features" className="text-lg font-medium text-slate-400 hover:text-white">Features</a>
            <a href="#how-it-works" className="text-lg font-medium text-slate-400 hover:text-white">How it Works</a>
            <a href="#pricing" className="text-lg font-medium text-slate-400 hover:text-white">Pricing</a>
            <button className="bg-primary text-white py-3 rounded-xl font-bold">Get Started</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="glass p-8 rounded-3xl group glass-hover"
  >
    <div className="bg-primary/20 p-4 rounded-2xl w-fit text-primary mb-6 group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video info');
      }
      const data = await response.json();
      setVideoInfo(data);
      // Wait for re-render then scroll to info
      setTimeout(() => {
        window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: string, quality: string) => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}`;
    window.location.href = downloadUrl;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-primary z-[60] origin-left" style={{ scaleX }} />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 px-4 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-40 -z-10" />

        {/* Floating Objects */}
        <FloatingObject delay={0} size="w-96 h-96" color="bg-blue-600/20" className="top-20 -left-20" />
        <FloatingObject delay={2} size="w-72 h-72" color="bg-primary/20" className="bottom-20 -right-20" />
        <FloatingObject delay={4} size="w-64 h-64" color="bg-accent/20" className="top-1/2 left-1/2 -translate-x-1/2" />

        <div className="max-w-4xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-primary text-sm font-bold border-primary/20"
          >
            <Shield size={16} />
            <span>Secure & Unlimited Downloads</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-tight"
          >
            Your Content, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              Without Limits.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 font-medium mb-12 max-w-2xl mx-auto"
          >
            Download YouTube videos and high-quality MP3s instantly. No ads, no limits, just pure high-performance speed.
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto w-full group"
          >
            <div className="relative glass p-2 rounded-2xl md:rounded-3xl focus-within:ring-2 ring-primary/50 transition-all flex items-center shadow-2xl">
              <div className="pl-6 text-slate-500">
                <Search size={24} />
              </div>
              <input
                type="text"
                placeholder="Paste YouTube video URL..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 text-lg md:text-xl py-4"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
              />
              <button
                onClick={fetchInfo}
                disabled={loading || !url}
                className="bg-primary hover:bg-primary-hover text-white px-8 md:px-12 py-4 rounded-xl md:rounded-2xl font-black transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <ArrowRight size={24} />}
                <span className="hidden md:block">{loading ? 'Processing...' : 'Download'}</span>
              </button>
            </div>
          </motion.div>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl max-w-2xl mx-auto"
              >
                <AlertCircle size={20} />
                <p className="font-bold">Error: {error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Result Section */}
      <AnimatePresence>
        {videoInfo && !loading && (
          <section id="result" className="py-24 px-4 bg-slate-900/50 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-[100%] opacity-50 -z-10" />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto"
            >
              <div className="glass p-8 md:p-12 rounded-[40px] border-white/5 shadow-2xl">
                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="w-full lg:w-[400px] flex-shrink-0 relative group">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full aspect-video lg:aspect-square object-cover rounded-[32px] shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-[32px]">
                      <Play className="text-white drop-shadow-2xl" fill="currentColor" size={64} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold">
                        <CheckCircle2 size={24} />
                      </div>
                      <span className="text-sm font-black text-primary tracking-widest uppercase">Ready to Download</span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                      {videoInfo.title}
                    </h2>

                    <div className="flex items-center gap-4 text-slate-400 font-bold mb-10">
                      <span className="bg-slate-800 px-3 py-1 rounded-lg text-xs">{videoInfo.uploader}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="text-sm">{formatDuration(videoInfo.duration)}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500 tracking-[0.2em] uppercase">
                          <Video size={16} />
                          <span>Video Selection</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(videoInfo.qualities || ['720p']).map((q) => (
                            <button
                              key={q}
                              onClick={() => handleDownload('mp4', q.replace('p', ''))}
                              className="flex-1 min-w-[100px] px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all hover:ring-2 ring-primary/50 flex items-center justify-center gap-2 group"
                            >
                              <span>{q}</span>
                              <Download size={16} className="text-primary group-hover:animate-bounce" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500 tracking-[0.2em] uppercase">
                          <Music size={16} />
                          <span>Audio Only</span>
                        </div>
                        <button
                          onClick={() => handleDownload('mp3', '0')}
                          className="w-full px-4 py-8 bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 rounded-3xl text-primary font-black transition-all flex flex-col items-center justify-center gap-3 group"
                        >
                          <Music size={32} className="group-hover:scale-110 transition-transform" />
                          <span className="text-lg">Download High Quality MP3</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        )}
      </AnimatePresence>

      {/* Features Section */}
      <section id="features" className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Why Choose <span className="text-primary">Us?</span></h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">The fastest way to download your favorite content without any annoying interruptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              description="Our backend processes downloads at incredible speeds using optimized streaming buffers."
              delay={0}
            />
            <FeatureCard
              icon={Shield}
              title="Privacy First"
              description="We don't track your downloads. Your data and history belong solely to you."
              delay={0.1}
            />
            <FeatureCard
              icon={Globe}
              title="Everywhere"
              description="Works on any device with a browser. Desktop, tablet, or mobile — we've got you covered."
              delay={0.2}
            />
            <FeatureCard
              icon={Layers}
              title="HD Quality"
              description="Support for up to 4K resolution and high-bitrate audio formats for the purest experience."
              delay={0.3}
            />
            <FeatureCard
              icon={Smartphone}
              title="Installable PWA"
              description="Install our app directly to your home screen for an even faster native-like experience."
              delay={0.4}
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Zero Ads"
              description="A clean, distraction-free interface focused purely on getting your content downloaded."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 border-t border-white/5 bg-black/50 overflow-hidden relative">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 blur-[150px] -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-primary p-2 rounded-lg text-white">
                <Youtube size={20} />
              </div>
              <span className="text-2xl font-black tracking-tighter">YT <span className="text-primary">Downloader</span></span>
            </div>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed mb-8">
              The ultimate high-performance YouTube downloader designed for the modern web. Built with speed, security, and aesthetics in mind.
            </p>
            <div className="flex gap-4">
              <button className="bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                <Github size={24} />
              </button>
              <button className="bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                <Twitter size={24} />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-[0.2em] text-sm">Product</h4>
            <ul className="space-y-4 text-slate-400 font-bold">
              <li><a href="#" className="hover:text-primary transition-colors">Extension</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Web App</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API for Devs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-[0.2em] text-sm">Legal</h4>
            <ul className="space-y-4 text-slate-400 font-bold">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Fair Use</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-slate-500 font-bold text-sm">
          © {new Date().getFullYear()} YT Downloader. Built for the community.
        </div>
      </footer>
    </div>
  );
}

export default App;

