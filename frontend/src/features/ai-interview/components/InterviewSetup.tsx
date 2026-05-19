import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Mic, MonitorUp, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface InterviewSetupProps {
  cameraStream: MediaStream | null;
  cameraReady: boolean;
  micReady: boolean;
  micLevel: number;
  screenReady: boolean;
  isStartingCamera: boolean;
  isStartingScreenShare: boolean;
  isTestingMicrophone: boolean;
  error?: string | null;
  onOpenCamera: () => Promise<unknown>;
  onShareScreen: () => Promise<unknown>;
  onTestMicrophone: () => Promise<unknown>;
  onEnterInterview: () => void;
}

const setupSteps = [
  { key: 'camera', title: 'Open camera', body: 'Keep your face clearly visible before entering the live interview.', icon: Video },
  { key: 'mic', title: 'Test microphone', body: 'Confirm the meter reacts while you speak normally.', icon: Mic },
  { key: 'screen', title: 'Share entire screen', body: 'Gravis needs the full screen context, not a tab or single window.', icon: MonitorUp },
];

const StatusPill = ({ label, ready }: { label: string; ready: boolean }) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] shadow-soft backdrop-blur-sm',
      ready
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/28 dark:bg-emerald-500/16 dark:text-emerald-50'
        : 'border-ink-200 bg-white/95 text-ink-700 dark:border-brand-300/18 dark:bg-[#142742] dark:text-ink-50',
    ].join(' ')}
  >
    <span className={['h-2 w-2 rounded-full', ready ? 'bg-emerald-500' : 'bg-ink-400'].join(' ')} />
    {label}
  </span>
);

export const InterviewSetup: React.FC<InterviewSetupProps> = ({
  cameraStream,
  cameraReady,
  error,
  isStartingCamera,
  isStartingScreenShare,
  isTestingMicrophone,
  micLevel,
  micReady,
  onEnterInterview,
  onOpenCamera,
  onShareScreen,
  onTestMicrophone,
  screenReady,
}) => {
  const previewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.srcObject = cameraStream;
    if (cameraStream) {
      previewRef.current.muted = true;
      void previewRef.current.play().catch(() => undefined);
    }
  }, [cameraStream]);

  const canEnterInterview = cameraReady && micReady && screenReady;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white/95 shadow-card backdrop-blur-xl dark:border-ink-dark-border dark:bg-ink-dark-surface/90">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="page-eyebrow">Pre-call device check</p>
              <h1 className="text-balance text-4xl font-semibold sm:text-5xl">Prepare your Gravis interview setup.</h1>
              <p className="page-copy">
                Complete the camera, microphone, and screen-share checks once before entering the live interview space. The setup will stay active across the session.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusPill label="Camera ready" ready={cameraReady} />
              <StatusPill label="Microphone ready" ready={micReady} />
              <StatusPill label="Entire screen shared" ready={screenReady} />
            </div>

            <div className="grid gap-4">
              {setupSteps.map((step, index) => {
                const ready = step.key === 'camera' ? cameraReady : step.key === 'mic' ? micReady : screenReady;
                const busy = step.key === 'camera' ? isStartingCamera : step.key === 'mic' ? isTestingMicrophone : isStartingScreenShare;
                const action =
                  step.key === 'camera' ? () => void onOpenCamera() : step.key === 'mic' ? () => void onTestMicrophone() : () => void onShareScreen();
                const label =
                  step.key === 'camera'
                    ? ready
                      ? 'Camera ready'
                      : busy
                        ? 'Opening camera...'
                        : 'Open camera'
                    : step.key === 'mic'
                      ? ready
                        ? 'Microphone ready'
                        : busy
                          ? 'Testing microphone...'
                          : 'Test microphone'
                      : ready
                        ? 'Entire screen ready'
                        : busy
                          ? 'Sharing screen...'
                          : 'Share entire screen';

                return (
                  <div key={step.key} className="muted-panel flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-400/10 dark:text-brand-100">
                        <step.icon size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900 dark:text-white">{index + 1}. {step.title}</p>
                          {ready ? <CheckCircle2 size={16} className="text-emerald-500" /> : null}
                        </div>
                        <p className="text-sm text-ink-600 dark:text-ink-200">{step.body}</p>
                      </div>
                    </div>

                    <Button type="button" variant={ready ? 'soft' : 'default'} onClick={action} disabled={busy || (step.key !== 'mic' && ready)}>
                      {label}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-ink-200 bg-ink-50/90 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">Microphone activity</p>
                  <p className="text-xs text-ink-500 dark:text-ink-300">A healthy signal means the meter should rise while you speak.</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-300">{micReady ? 'Ready' : 'Waiting'}</span>
              </div>

              <div className="mt-4 flex items-end gap-1">
                {Array.from({ length: 18 }).map((_, index) => {
                  const threshold = (index + 1) / 18;
                  const active = micLevel >= threshold;
                  return (
                    <span
                      key={index}
                      className={['w-full rounded-full transition-all duration-150', active ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-white/10'].join(' ')}
                      style={{ height: `${12 + (index % 6) * 6}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-ink-200 bg-ink-950 shadow-glass dark:border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white/80">
                <span className="text-sm font-medium">Camera preview</span>
                <span className="text-xs">{cameraReady ? 'Live' : 'Waiting for camera'}</span>
              </div>
              <div className="aspect-[4/5] bg-ink-950">
                <video ref={previewRef} className="h-full w-full object-cover" autoPlay playsInline muted />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-6 dark:border-brand-400/20 dark:from-brand-400/10 dark:via-ink-dark-surface dark:to-accent-400/10">
              <p className="page-eyebrow">Before you enter</p>
              <ul className="mt-4 space-y-3 text-sm text-ink-700 dark:text-ink-200">
                <li>Keep your face visible and your microphone unobstructed.</li>
                <li>Share your entire screen and avoid switching away during the session.</li>
                <li>When ready, Gravis will continue with a polished live interview experience.</li>
              </ul>

              <Button type="button" className="mt-6 w-full" size="lg" onClick={onEnterInterview} disabled={!canEnterInterview}>
                Enter interview
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
