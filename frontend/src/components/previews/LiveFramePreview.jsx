import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export default function LiveFramePreview({ url, title, isVisible }) {
  const [loading, setLoading] = useState(true);
  const [frameError, setFrameError] = useState(false);
  const [key, setKey] = useState(0);

  const handleReload = () => {
    setLoading(true);
    setFrameError(false);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-[320px] bg-bg-secondary rounded-xl overflow-hidden border border-border flex flex-col">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
          <span className="text-text-muted ml-2 text-[11px] truncate max-w-[180px] sm:max-w-[240px]">
            {url}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
            title="Reload frame"
            aria-label="Reload preview frame"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-brand-purple hover:underline"
            title="Open live site in new tab"
          >
            <span>Open</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative flex-1 bg-bg-card">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-card/90 backdrop-blur-sm gap-2 text-text-secondary text-xs font-mono">
            <Loader2 size={20} className="animate-spin text-brand-purple" />
            <span>Connecting to live deployment...</span>
          </div>
        )}

        {frameError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 bg-bg-card">
            <AlertCircle size={28} className="text-brand-purple opacity-80" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">Direct preview restricted by host</p>
              <p className="text-xs text-text-secondary max-w-sm">
                This deployment includes security headers (X-Frame-Options/CSP) that prevent iframe embedding.
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-1 text-xs"
            >
              Open {title} in New Tab
              <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          isVisible && (
            <iframe
              key={key}
              src={url}
              title={`${title} Live Preview`}
              className="w-full h-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFrameError(true);
              }}
            />
          )
        )}
      </div>

      {/* Live disclaimer note */}
      <div className="px-3 py-1 bg-bg-tertiary border-t border-border text-[10px] font-mono text-text-muted flex items-center justify-between">
        <span>● LIVE DEPLOYMENT EMBED</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline text-text-secondary">
          Visit external site →
        </a>
      </div>
    </div>
  );
}

