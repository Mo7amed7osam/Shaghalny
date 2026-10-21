import React, { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface CameraRecorderProps {
  cameraStream: MediaStream | null;
  isRecording: boolean;
  statusText?: string;
  error?: string | null;
  className?: string;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  cameraStream,
  isRecording,
  statusText,
  error,
  className,
}) => {
  const previewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!previewRef.current) return;

    previewRef.current.src = '';
    previewRef.current.srcObject = cameraStream;
    if (cameraStream) {
      previewRef.current.muted = true;
      void previewRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

  return (
    <div className={cn('pointer-events-none w-full max-w-[15rem] rounded-[1.6rem] border border-white/10 bg-black/60 p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl', className)}>
      <div className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-black">
        <video aria-label="Your camera preview (muted)" ref={previewRef} className="aspect-[4/5] w-full object-cover" autoPlay playsInline muted />
      </div>

      <div className="space-y-2 px-1.5 pb-1 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">You</p>
          <div className="flex items-center gap-2">
            <span className={['h-2.5 w-2.5 rounded-full transition-colors', isRecording ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.95)]' : 'bg-emerald-400'].join(' ')} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{isRecording ? 'Live' : 'Ready'}</span>
          </div>
        </div>

        <p className="text-xs leading-5 text-white/70">{statusText || 'Camera stays live during the interview.'}</p>
        {error ? <p role="alert" className="rounded-2xl border border-rose-300/15 bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-200">{error}</p> : null}
      </div>
    </div>
  );
};
