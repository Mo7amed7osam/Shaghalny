import React from 'react';
import { Bot } from 'lucide-react';

type AvatarStatus = 'idle' | 'speaking' | 'listening' | 'recording' | 'processing';

interface AIInterviewerAvatarProps {
  status: AvatarStatus;
  questionText?: string;
  onReplayQuestion?: () => void;
  speechSupported?: boolean;
}

const statusLabelMap: Record<AvatarStatus, string> = {
  idle: 'Ready',
  speaking: 'Speaking question...',
  listening: 'Listening...',
  recording: 'Recording answer...',
  processing: 'Processing answer...',
};

export const AIInterviewerAvatar: React.FC<AIInterviewerAvatarProps> = ({
  status,
  questionText,
  speechSupported = true,
}) => {
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening' || status === 'recording';
  const isProcessing = status === 'processing';

  return (
    <div className="relative flex flex-col items-center justify-center text-center text-white">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-56 w-56 -translate-y-1/2 rounded-full bg-brand-500/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-72 w-72 -translate-y-1/2 rounded-full bg-accent-400/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl" />
          <div className={['absolute inset-4 rounded-full border border-white/10 transition-transform duration-500', isSpeaking ? 'scale-110 bg-brand-400/10' : 'bg-white/[0.02]'].join(' ')} />
          <div className={['absolute inset-[-6%] rounded-full border transition-transform duration-500', isListening ? 'scale-105 border-emerald-300/35' : 'border-white/5'].join(' ')} />

          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#dbeafe_35%,#7dd3fc_60%,#1e3a8a_100%)] shadow-[0_30px_90px_rgba(3,7,18,0.5)]">
            <div className={['absolute inset-0 rounded-full border border-white/25', isSpeaking ? 'animate-[pulse_1.6s_ease-in-out_infinite]' : ''].join(' ')} />
            <div className="absolute inset-4 rounded-full border border-white/40" />
            <Bot size={38} className="text-ink-950" />
          </div>

          {isListening ? <div className="absolute inset-0 rounded-full border border-emerald-300/60 animate-ping" /> : null}
          {isProcessing ? <div className="absolute inset-0 rounded-full border-[3px] border-white/10 border-t-white/80 animate-spin" /> : null}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Shaghalny AI interviewer</p>
            <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Gravis</h2>
            <p className="mx-auto max-w-2xl text-sm text-white/60">
              {questionText
                ? 'I will ask the question, then wait for your answer in the same live interview flow.'
                : 'Your interviewer is ready.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={[
                  'w-1.5 rounded-full transition-all duration-300',
                  isSpeaking
                    ? `h-8 bg-white/80 animate-[pulse_${0.6 + bar * 0.1}s_ease-in-out_infinite]`
                    : isListening
                      ? 'h-5 bg-emerald-300/95'
                      : isProcessing
                        ? 'h-4 bg-white/40'
                        : 'h-3 bg-white/25',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="flex justify-center">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white/82">
              {statusLabelMap[status]}
            </span>
          </div>
        </div>

        {!speechSupported ? <p className="text-xs text-amber-200">Voice playback unavailable on this browser.</p> : null}
      </div>
    </div>
  );
};
