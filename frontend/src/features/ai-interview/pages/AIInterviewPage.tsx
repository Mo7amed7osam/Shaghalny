import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { AIInterviewerAvatar } from '../components/AIInterviewerAvatar';
import { CameraRecorder } from '../components/CameraRecorder';
import { InterviewProgress } from '../components/InterviewProgress';
import { InterviewQuestion } from '../components/InterviewQuestion';
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
    setStage('call');
  }, [canEnterInterview, resetQuestionFlow]);

  const handleReturnToSetup = useCallback(() => {
    cancelQuestionSpeech();
    resetQuestionFlow();
    hasAutoSpokenRef.current = null;
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
    if (callPhase === 'processingAnswer') return 'Processing...';
    if (callPhase === 'speakingQuestion') return 'Gravis is speaking...';
    if (callPhase === 'recordingAnswer') return 'Recording your answer...';
    return 'Press record when you are ready.';
  }, [callPhase]);

const aiProcessingSteps = useMemo(() => {
    if (callPhase !== 'processingAnswer') return null;
    return [
      '🎙️ Analyzing your answer...',
      '🧠 Evaluating technical knowledge...',
      '💬 Assessing communication quality...',
      '⚡ Generating AI feedback...',
    ];
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
    return (
      <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#05070d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(58,118,255,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(18,27,44,0.72),transparent_42%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%,transparent_84%,rgba(255,255,255,0.03))]" />

        <div className="relative flex h-full w-full flex-col px-5 py-5 md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-xs space-y-2">
              <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
                <span>Live interview</span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>{session.skill}</span>
              </div>

              <div className="max-w-[15rem]">
                <InterviewProgress
                  answeredCount={session.answers.length}
                  totalQuestions={session.questions.length}
                  variant="inverted"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="brand" className="border-brand-300/22 bg-[#142742]/92 text-ink-50">
                {session.answers.length + 1} / {session.questions.length}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                className="border border-brand-300/18 bg-[#142742]/88 text-ink-50 hover:bg-[#19314f] hover:text-white"
                onClick={handleBackToSkills}
              >
                Leave
              </Button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-28 pt-6 md:px-8">
            <div className="relative flex w-full flex-1 items-center justify-center">
              <div className="pointer-events-none absolute inset-x-0 top-[10%] mx-auto h-64 max-w-4xl rounded-full bg-brand-500/10 blur-3xl" />

              <div className="w-full max-w-4xl">
                <AIInterviewerAvatar
                  status={avatarStatus}
                  questionText={nextQuestion.text}
                  speechSupported={speechSupported}
                />
              </div>
            </div>

            <div className="absolute bottom-5 right-5 z-10 md:bottom-6 md:right-6">
              <CameraRecorder
                cameraStream={cameraStream}
                isRecording={isRecording}
                error={error}
                statusText={statusText}
              />
            </div>

            {SHOW_MIC_DEBUG ? (
              <div className="absolute bottom-5 left-5 z-10 w-[15rem] rounded-2xl border border-white/10 bg-black/45 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur-md md:bottom-6 md:left-6">
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

                <div className="mt-3 space-y-1 text-xs text-white/84">
                  <p>State: {micDebugState}</p>
                  <p>Camera: {cameraReady ? 'ready' : 'offline'}</p>
                  <p>Screen: {screenReady ? 'ready' : 'offline'}</p>
                  <p>Mic: {micReady ? 'ready' : 'offline'}</p>
                  <p>Recorder: {isRecording ? 'active' : 'idle'}</p>
                </div>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4">
              <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-3">
                <InterviewQuestion question={nextQuestion} variant="overlay" />

                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-white/88">{statusText}</p>
                  {callPhase === 'idle' ? (
                    <p className="text-xs text-white/55">Start recording when you are ready to answer.</p>
                  ) : null}
                  {callPhase === 'recordingAnswer' ? (
                    <p className="text-xs text-white/55">Recording will continue until you stop and submit.</p>
                  ) : null}
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
                  {statusError ? (
                    <p className="text-sm text-rose-300">{statusError}</p>
                  ) : null}
{aiProcessingSteps ? (
  <div className="space-y-1 text-center">
    {aiProcessingSteps.map((step, i) => (
      <p key={i} className="text-xs text-white/60 animate-pulse">{step}</p>
    ))}
  </div>
) : null}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {canStartAnswerRecording ? (
                    <Button type="button" size="lg" onClick={() => void startAnswerRecording()}>
                      Start recording
                    </Button>
                  ) : null}

                  {canStopAnswerRecording ? (
                    <Button type="button" size="lg" onClick={handleStopAnswerRecording}>
                      Stop and submit
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  {canReplayQuestion ? (
                    <button
                      type="button"
                      className="text-white/84 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                      onClick={handleReplayQuestion}
                    >
                      Replay question
                    </button>
                  ) : null}

                  {retryPayload ? (
                    <button
                      type="button"
                      className="text-white/84 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                      onClick={handleRetryUpload}
                      disabled={answerMutation.isPending}
                    >
                      Retry upload
                    </button>
                  ) : null}

                  {statusError ? (
                    <button
                      type="button"
                      className="text-white/84 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                      onClick={handleRestartAnswer}
                      disabled={answerMutation.isPending || !cameraReady || !micReady || !screenReady}
                    >
                      Try this answer again
                    </button>
                  ) : null}

                  {statusError && (!cameraReady || !micReady || !screenReady) ? (
                    <button
                      type="button"
                      className="text-white/84 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                      onClick={handleReturnToSetup}
                    >
                      Reconnect setup
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
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
