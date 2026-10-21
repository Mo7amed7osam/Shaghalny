import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Bot, LogOut, Mic, Monitor, RotateCcw, Square, Video, Wifi,
} from 'lucide-react';

import { CameraRecorder } from '../components/CameraRecorder';
import { InterviewSetup } from '../components/InterviewSetup';
import { useQuestionSpeech } from '../hooks/useQuestionSpeech';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { getInterviewSession, submitInterviewAnswer } from '../services/interviewApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type InterviewStage = 'setup' | 'call';
type CallPhase = 'speakingQuestion' | 'recordingAnswer' | 'processingAnswer' | 'idle';
type RecordedCapture = {
  cameraFile: File;
  screenFile: File;
};

const SHOW_MIC_DEBUG = false; // Hide mic debug during live interview

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const AIInterviewPage: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<InterviewStage>('setup');
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<{ questionId: string; files: RecordedCapture } | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const {
    cameraReady,
    cameraStream,
    cleanup,
    error,
    isRecording,
    isStartingCamera,
    isStartingScreenShare,
    isTestingMicrophone,
    micLevel,
    micReady,
    resetRecording,
    screenReady,
    startCamera,
    startRecording,
    startScreenShare,
    stopRecording,
    testMicrophone,
  } = useVideoRecorder();

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['ai-interview', sessionId],
    queryFn: () => getInterviewSession(sessionId as string),
    enabled: Boolean(sessionId),
  });

  const nextQuestion = useMemo(() => {
    if (!session) return null;
    const answeredIds = new Set(session.answers.map((answer) => answer.questionId));
    return session.questions.find((question) => !answeredIds.has(question.id)) || null;
  }, [session]);

  const {
    cancel: cancelQuestionSpeech,
    hasSpoken,
    isSpeaking,
    speak,
    speechBlocked,
    speechSupported,
    reset: resetQuestionSpeech,
  } = useQuestionSpeech(nextQuestion?.text, Boolean(nextQuestion) && stage === 'call');

  const questionId = nextQuestion?.id ?? null;
  const canEnterInterview = cameraReady && micReady && screenReady;

  const hasAutoSpokenRef = useRef<string | null>(null);
  const isStartingRecordingRef = useRef(false);
  const isStoppingRecordingRef = useRef(false);
  const isUploadingRef = useRef(false);
  const recordingQuestionRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  const answerMutation = useMutation({
    mutationFn: async (payload: { questionId: string; files: RecordedCapture }) => {
      if (!sessionId) {
        throw new Error('Interview session is missing.');
      }
      return submitInterviewAnswer(sessionId, payload.questionId, payload.files);
    },
    onSuccess: async (response) => {
      isUploadingRef.current = false;
      setRetryPayload(null);
      // If server indicated no audio, show friendly message
      const NO_AUDIO_SERVER_MSG = 'Uploaded camera video does not contain an audio track.';
      const NO_AUDIO_FRIENDLY = "We couldn't detect audio in your recording. Please make sure your microphone is enabled and try again.";
      if (response?.evaluation?.processingError === NO_AUDIO_SERVER_MSG) {
        setStatusError(NO_AUDIO_FRIENDLY);
      } else {
        setStatusError(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['ai-interview', sessionId] });
      if (response.completed) {
        navigate(`/student/ai-interview/${sessionId}/result`);
      }
    },
    onError: () => {
      isUploadingRef.current = false;
    },
  });

  const resetQuestionFlow = useCallback(() => {
    setStatusError(null);
    setRetryPayload(null);
    recordingQuestionRef.current = null;
    isStartingRecordingRef.current = false;
    isStoppingRecordingRef.current = false;
    isUploadingRef.current = false;
    resetRecording();
    resetQuestionSpeech();
  }, [resetQuestionSpeech, resetRecording]);

  const handleBackToSkills = useCallback(() => {
    cancelQuestionSpeech();
    cleanup();
    navigate('/student/skill-verification');
  }, [cancelQuestionSpeech, cleanup, navigate]);

  const submitAnswerFiles = useCallback(
    async (payload: { questionId: string; files: RecordedCapture }) => {
      if (isUploadingRef.current) {
        return false;
      }

      isUploadingRef.current = true;
      setRetryPayload(payload);
      setStatusError(null);
      setCallPhase('processingAnswer');

      try {
        await answerMutation.mutateAsync(payload);
        return true;
      } catch (submissionError) {
        setStatusError(getErrorMessage(submissionError, "We couldn't process that answer. Please try again."));
        setCallPhase('idle');
        return false;
      }
    },
    [answerMutation]
  );

  const finalizeCurrentAnswer = useCallback(async () => {
    if (!questionId || isStoppingRecordingRef.current || isUploadingRef.current) {
      return;
    }

    isStoppingRecordingRef.current = true;
    setCallPhase('processingAnswer');

    try {
      const files = await stopRecording();
      if (!files) {
        setStatusError("We couldn't capture that answer. Please try again.");
        setCallPhase('idle');
        return;
      }

      await submitAnswerFiles({ questionId, files });
    } catch (stopError) {
      setStatusError(getErrorMessage(stopError, "We couldn't capture that answer. Please try again."));
      setCallPhase('idle');
    } finally {
      isStoppingRecordingRef.current = false;
      recordingQuestionRef.current = null;
    }
  }, [questionId, stopRecording, submitAnswerFiles]);

  const startAnswerRecording = useCallback(async () => {
    if (
      !questionId ||
      isStartingRecordingRef.current ||
      isStoppingRecordingRef.current ||
      isUploadingRef.current ||
      recordingQuestionRef.current === questionId ||
      isRecording
    ) {
      return;
    }

    isStartingRecordingRef.current = true;
    setStatusError(null);

    try {
      startRecording();
      recordingQuestionRef.current = questionId;
      setCallPhase('recordingAnswer');
    } catch (startError) {
      recordingQuestionRef.current = null;
      setStatusError(getErrorMessage(startError, 'Unable to start answer capture.'));
      setCallPhase('idle');
    } finally {
      isStartingRecordingRef.current = false;
    }
  }, [isRecording, questionId, startRecording]);

  const handleEnterInterview = useCallback(() => {
    if (!canEnterInterview) return;
    resetQuestionFlow();
    sessionStartedAtRef.current = Date.now();
    setSessionSeconds(0);
    setStage('call');
  }, [canEnterInterview, resetQuestionFlow]);

  const handleReturnToSetup = useCallback(() => {
    cancelQuestionSpeech();
    resetQuestionFlow();
    hasAutoSpokenRef.current = null;
    sessionStartedAtRef.current = null;
    setSessionSeconds(0);
    setCallPhase('idle');
    setStage('setup');
  }, [cancelQuestionSpeech, resetQuestionFlow]);

  const handleRetryUpload = useCallback(() => {
    if (!retryPayload || answerMutation.isPending || isUploadingRef.current) return;
    void submitAnswerFiles(retryPayload);
  }, [answerMutation.isPending, retryPayload, submitAnswerFiles]);

  const handleRestartAnswer = useCallback(() => {
    if (!questionId || answerMutation.isPending) return;
    resetQuestionFlow();
    hasAutoSpokenRef.current = null;
    setCallPhase('speakingQuestion');
  }, [answerMutation.isPending, questionId, resetQuestionFlow]);

  const handleReplayQuestion = useCallback(() => {
    if (callPhase === 'processingAnswer' || isSpeaking || isRecording) {
      return;
    }

    setCallPhase('speakingQuestion');
    void speak('manual');
  }, [callPhase, isRecording, isSpeaking, speak]);

  const handleStopAnswerRecording = useCallback(() => {
    void finalizeCurrentAnswer();
  }, [finalizeCurrentAnswer]);

  useEffect(() => {
    if (stage !== 'call') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'call' || !questionId) {
      return;
    }

    resetQuestionFlow();
    hasAutoSpokenRef.current = null;
    setCallPhase('speakingQuestion');
  }, [questionId, resetQuestionFlow, stage]);

  useEffect(() => {
    if (stage !== 'call' || !questionId || callPhase !== 'speakingQuestion' || hasAutoSpokenRef.current === questionId) {
      return;
    }

    hasAutoSpokenRef.current = questionId;

    if (!speechSupported) {
      return;
    }

    void speak('auto');
  }, [callPhase, questionId, speak, speechSupported, stage]);

  useEffect(() => {
    if (stage !== 'call' || !questionId || callPhase !== 'speakingQuestion') {
      return;
    }

    if (speechSupported && !speechBlocked && !hasSpoken) {
      return;
    }

    setCallPhase('idle');
  }, [callPhase, hasSpoken, questionId, speechBlocked, speechSupported, stage]);

  useEffect(() => {
    if (stage !== 'call') {
      return;
    }

    if (!screenReady || !cameraReady || !micReady) {
      if (isRecording && !isStoppingRecordingRef.current) {
        setStatusError(error || 'Interview inputs were interrupted. Reconnect setup to continue.');
      }
      setCallPhase((current) => (current === 'processingAnswer' ? current : 'idle'));
    }
  }, [cameraReady, error, isRecording, micReady, screenReady, stage]);

  const statusText = useMemo(() => {
    if (callPhase === 'processingAnswer') return 'Submitting and evaluating your answer...';
    if (callPhase === 'speakingQuestion') return 'Gravis is speaking...';
    if (callPhase === 'recordingAnswer') return 'Recording your answer...';
    return 'Press record when you are ready.';
  }, [callPhase]);

  const avatarStatus = useMemo(() => {
    if (callPhase === 'processingAnswer') return 'processing' as const;
    if (callPhase === 'speakingQuestion') return 'speaking' as const;
    if (callPhase === 'recordingAnswer') return 'recording' as const;
    return 'idle' as const;
  }, [callPhase]);

  const canReplayQuestion =
    stage === 'call' &&
    speechSupported &&
    !isSpeaking &&
    !isRecording &&
    callPhase !== 'processingAnswer' &&
    !answerMutation.isPending;

  const micDebugState = useMemo(() => {
    if (callPhase === 'processingAnswer') return 'Uploading';
    if (callPhase === 'speakingQuestion') return 'Question playback';
    if (callPhase === 'recordingAnswer') return 'Recording';
    return 'Ready';
  }, [callPhase]);

  const canStartAnswerRecording =
    stage === 'call' &&
    callPhase === 'idle' &&
    !isRecording &&
    !isSpeaking &&
    !answerMutation.isPending &&
    cameraReady &&
    micReady &&
    screenReady;

  const canStopAnswerRecording =
    stage === 'call' &&
    callPhase === 'recordingAnswer' &&
    isRecording &&
    !answerMutation.isPending;

  // Track recording duration for the bottom control bar.
  useEffect(() => {
    if (callPhase !== 'recordingAnswer') {
      setRecordingSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => window.clearInterval(timer);
  }, [callPhase]);

  // Keep the header timer tied to the live interview session, not to each recording.
  useEffect(() => {
    if (stage !== 'call') {
      return undefined;
    }

    if (sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
    }

    const updateSessionDuration = () => {
      const startedAt = sessionStartedAtRef.current;
      if (startedAt === null) return;
      setSessionSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };

    updateSessionDuration();
    const timer = window.setInterval(updateSessionDuration, 1000);

    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsCompactViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="text-sm text-ink-600 dark:text-ink-300">Interview session not found.</p>
          <Button type="button" variant="ghost" onClick={handleBackToSkills}>
            Back to skills
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (session.status === 'completed') {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Interview already completed. Open result page.
          </p>
          <Button type="button" onClick={() => navigate(`/student/ai-interview/${session.sessionId}/result`)}>
            View result
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCompactViewport) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            This interview must be completed on a desktop or laptop.
          </p>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            The verification flow requires camera, microphone, and entire-screen sharing, which is not reliable on mobile browsers.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={handleBackToSkills}>
              Back to skills
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/student/ai-interview/${session.sessionId}/result`)}>
              Open result page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextQuestion) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="text-sm text-ink-600 dark:text-ink-300">No interview questions are available.</p>
          <Button type="button" variant="ghost" onClick={handleBackToSkills}>
            Back to skills
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stage === 'call') {
    const totalQuestions = session.questions.length;
    const currentNumber = Math.min(session.answers.length + 1, totalQuestions);
    const completionPct = totalQuestions
      ? Math.round((session.answers.length / totalQuestions) * 100)
      : 0;
    const connectionOk = cameraReady && micReady && screenReady;
    const isRecordingPhase = callPhase === 'recordingAnswer';

    const aiStatusLabel =
      callPhase === 'speakingQuestion'
        ? 'Speaking'
        : callPhase === 'processingAnswer'
          ? 'Evaluating answer'
          : isRecordingPhase
            ? 'Listening'
            : 'Waiting for you';

    const deviceChecklist = [
      { label: 'Microphone', ready: micReady, icon: Mic },
      { label: 'Camera', ready: cameraReady, icon: Video },
      { label: 'Screen share', ready: screenReady, icon: Monitor },
    ];

    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#05070d] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(58,118,255,0.22),transparent_30%),radial-gradient(circle_at_18%_90%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(18,27,44,0.72),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%,transparent_84%,rgba(255,255,255,0.03))]" />

        {/* Top bar */}
        <header className="relative z-20 flex h-[4.5rem] shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-white/[0.045] px-4 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.9)] backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{session.skill} interview</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                Live · Skill verification
              </p>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center px-6 md:flex">
            <div className="w-full max-w-sm space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                <span>Question {currentNumber} of {totalQuestions}</span>
                <span>{completionPct}% complete</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-xs tabular-nums text-white/70 md:inline-flex">
              <span className="sr-only">Interview duration:</span>
              {formatDuration(sessionSeconds)}
            </span>
            <Badge variant="brand" className="border-brand-300/20 bg-[#142742]/90 text-ink-50 md:hidden">
              {currentNumber} / {totalQuestions}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              className="border border-white/10 bg-white/[0.05] text-white/85 hover:bg-white/10 hover:text-white"
              onClick={handleBackToSkills}
            >
              <LogOut size={14} />
              Leave
            </Button>
          </div>
        </header>

        {/* Main area: question card + session panel */}
        <div className="relative z-10 grid min-h-0 flex-1 gap-5 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="relative flex min-w-0 items-center justify-center">
            <div className="pointer-events-none absolute inset-x-0 top-[12%] mx-auto h-72 max-w-4xl rounded-full bg-brand-500/12 blur-3xl" />

            <div
              key={nextQuestion.id}
              className="animate-fade-up relative w-full max-w-4xl rounded-[2rem] border border-white/15 bg-white/[0.065] px-6 py-7 shadow-[0_34px_100px_rgba(3,7,18,0.58),0_1px_0_rgba(255,255,255,0.12)_inset] backdrop-blur-2xl md:px-9 md:py-9"
            >
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-2 pr-4">
                  <span
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#dbeafe_35%,#7dd3fc_60%,#1e3a8a_100%)]',
                      callPhase === 'speakingQuestion' ? 'animate-[pulse_1.6s_ease-in-out_infinite]' : '',
                    ].join(' ')}
                  >
                    <Bot size={15} className="text-ink-950" />
                  </span>
                  <span className="text-xs font-medium text-white/80">Gravis · {aiStatusLabel}</span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/70">
                  {session.skill}
                </span>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                Question {nextQuestion.order}
              </p>
              <h1 aria-live="polite" aria-atomic="true" className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                {nextQuestion.text}
              </h1>

              <div className="mt-7 grid gap-3 text-left md:grid-cols-3">
                {['Answer directly first', 'Use one concrete example', 'Keep it under two minutes'].map((tip) => (
                  <div key={tip} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs font-semibold text-white/80">{tip}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <p role="status" className="text-sm font-medium text-white/85">{statusText}</p>
                {speechBlocked ? (
                  <p className="text-xs text-amber-200">
                    Voice playback failed. Gravis switched to text and recording may continue.
                  </p>
                ) : null}
                {!speechSupported ? (
                  <p className="text-xs text-amber-200">
                    Voice playback is unavailable in this browser. Gravis will continue in text only.
                  </p>
                ) : null}
                {statusError ? <p className="text-sm text-rose-300">{statusError}</p> : null}
                {callPhase === 'processingAnswer' ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-300/25 bg-brand-500/10 px-4 py-3"
                  >
                    <span
                      className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200/35 border-t-brand-200"
                      aria-hidden="true"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold leading-5 text-white">Your answer is being reviewed</p>
                      <p className="text-xs leading-5 text-white/70">
                        Keep this window open. The next question will appear automatically.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {canReplayQuestion ? (
                <button
                  type="button"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  onClick={handleReplayQuestion}
                >
                  <RotateCcw size={13} />
                  Replay question
                </button>
              ) : null}
            </div>
          </section>

          {/* Right panel: camera + session status */}
          <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto lg:flex">
            <CameraRecorder
              cameraStream={cameraStream}
              isRecording={isRecording}
              error={error}
              statusText={statusText}
              className="max-w-none"
            />

            <div className="rounded-[1.6rem] border border-white/10 bg-black/45 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Session status
              </p>

              <div className="mt-3 space-y-2.5">
                {deviceChecklist.map((device) => {
                  const DeviceIcon = device.icon;
                  return (
                    <div key={device.label} className="flex items-center gap-2.5 text-xs text-white/80">
                      <DeviceIcon size={13} className="shrink-0 text-white/45" />
                      <span className="flex-1">{device.label}</span>
                      <span
                        className={[
                          'h-2 w-2 rounded-full',
                          device.ready ? 'bg-emerald-400' : 'bg-rose-400',
                        ].join(' ')}
                      />
                      <span className="w-14 text-right text-[11px] text-white/55">
                        {device.ready ? 'Ready' : 'Offline'}
                      </span>
                    </div>
                  );
                })}

                <div className="flex items-center gap-2.5 border-t border-white/10 pt-2.5 text-xs text-white/80">
                  <Wifi size={13} className="shrink-0 text-white/45" />
                  <span className="flex-1">Connection</span>
                  <span
                    className={[
                      'h-2 w-2 rounded-full',
                      connectionOk ? 'bg-emerald-400' : 'bg-amber-400',
                    ].join(' ')}
                  />
                  <span className="w-14 text-right text-[11px] text-white/55">
                    {connectionOk ? 'Stable' : 'Check'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-white/80">
                  <Bot size={13} className="shrink-0 text-white/45" />
                  <span className="flex-1">Gravis</span>
                  <span
                    className={[
                      'h-2 w-2 rounded-full',
                      callPhase === 'processingAnswer'
                        ? 'animate-pulse bg-brand-300'
                        : callPhase === 'speakingQuestion'
                          ? 'animate-pulse bg-brand-400'
                          : 'bg-emerald-400',
                    ].join(' ')}
                  />
                  <span className="text-right text-[11px] text-white/55">{aiStatusLabel}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Floating camera preview when the side panel is hidden */}
          <div className="absolute bottom-4 right-4 z-10 lg:hidden">
            <CameraRecorder
              cameraStream={cameraStream}
              isRecording={isRecording}
              error={error}
              statusText={statusText}
            />
          </div>
        </div>

        {/* Bottom controls */}
        <footer className="relative z-20 shrink-0 border-t border-white/10 bg-white/[0.045] px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-3 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)]">
            <div className="flex min-h-11 flex-wrap items-center justify-center gap-4">
              {isRecordingPhase ? (
                <div className="flex items-center gap-3" aria-live="polite">
                  <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-[3px] origin-center rounded-full bg-rose-400/90"
                        style={{
                          height: `${10 + ((i * 37) % 20)}px`,
                          animation: `waveform ${0.8 + ((i * 13) % 10) / 18}s ease-in-out ${(i % 8) * 0.06}s infinite`,
                          transform: `scaleY(${0.45 + Math.min(0.55, micLevel * 1.4)})`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm tabular-nums text-white/85">
                    {formatDuration(recordingSeconds)}
                  </span>
                </div>
              ) : null}

              {canStartAnswerRecording ? (
                <Button type="button" size="lg" onClick={() => void startAnswerRecording()}>
                  <Mic size={15} />
                  Start recording
                </Button>
              ) : null}

              {canStopAnswerRecording ? (
                <Button type="button" size="lg" variant="danger" onClick={handleStopAnswerRecording}>
                  <Square size={13} className="fill-current" />
                  Stop and submit
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
              {retryPayload ? (
                <button
                  type="button"
                  className="text-white/80 underline decoration-white/25 underline-offset-4 transition hover:text-white disabled:opacity-50"
                  onClick={handleRetryUpload}
                  disabled={answerMutation.isPending}
                >
                  Retry upload
                </button>
              ) : null}

              {statusError ? (
                <button
                  type="button"
                  className="text-white/80 underline decoration-white/25 underline-offset-4 transition hover:text-white disabled:opacity-50"
                  onClick={handleRestartAnswer}
                  disabled={answerMutation.isPending || !cameraReady || !micReady || !screenReady}
                >
                  Try this answer again
                </button>
              ) : null}

              {statusError && (!cameraReady || !micReady || !screenReady) ? (
                <button
                  type="button"
                  className="text-white/80 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                  onClick={handleReturnToSetup}
                >
                  Reconnect setup
                </button>
              ) : null}
            </div>
          </div>
        </footer>

        {SHOW_MIC_DEBUG ? (
          <div className="absolute bottom-24 left-5 z-30 w-[15rem] rounded-2xl border border-white/10 bg-black/45 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Mic debug
              </p>
              <span className="text-[11px] text-white/65">{micLevel.toFixed(2)}</span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-300 transition-[width] duration-150"
                style={{ width: `${Math.min(100, micLevel * 100)}%` }}
              />
            </div>

            <div className="mt-3 space-y-1 text-xs text-white/85">
              <p>State: {micDebugState}</p>
              <p>Camera: {cameraReady ? 'ready' : 'offline'}</p>
              <p>Screen: {screenReady ? 'ready' : 'offline'}</p>
              <p>Mic: {micReady ? 'ready' : 'offline'}</p>
              <p>Recorder: {isRecording ? 'active' : 'idle'}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InterviewSetup
        cameraReady={cameraReady}
        cameraStream={cameraStream}
        error={error}
        isStartingCamera={isStartingCamera}
        isStartingScreenShare={isStartingScreenShare}
        isTestingMicrophone={isTestingMicrophone}
        micLevel={micLevel}
        micReady={micReady}
        onEnterInterview={handleEnterInterview}
        onOpenCamera={startCamera}
        onShareScreen={startScreenShare}
        onTestMicrophone={testMicrophone}
        screenReady={screenReady}
      />
    </div>
  );
};

export default AIInterviewPage;
