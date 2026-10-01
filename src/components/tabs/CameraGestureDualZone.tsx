import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Sparkles, RefreshCw, CheckCircle2, Hand, Info, Minimize2, Maximize2, Zap, AlertCircle, Swords, Trophy, RotateCcw, ChevronUp, ChevronDown, Timer, Settings } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export interface ActiveQuestionInfo {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  subject?: string;
}

interface CameraGestureDualZoneProps {
  isEnabled: boolean;
  isQuestionStarted: boolean;
  playFormat: 'simultaneous' | 'turns' | 'speed';
  currentTurn: 'red' | 'blue';
  matchWinner: 'red' | 'blue' | null;
  onRedAnswer: (optionIdx: number) => void;
  onBlueAnswer: (optionIdx: number) => void;
  redSelectedOption: { idx: number; result: 'correct' | 'wrong' } | null;
  blueSelectedOption: { idx: number; result: 'correct' | 'wrong' } | null;
  currentRedQuestionIdx: number;
  currentBlueQuestionIdx: number;
  holdDurationMs?: number; // Time in ms to confirm gesture (default: 800ms)
  onToggleCamera: () => void;
  onStartMatch?: () => void;
  onToggleFullscreen?: () => void;
  onOpenConfig?: () => void;
  // Timer props
  timeLeft?: number;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
  // Question & Match Data for Full Camera Battle Mode
  currentQuestion?: ActiveQuestionInfo | null;
  redScore: number;
  blueScore: number;
  redAnswerCount: number;
  blueAnswerCount: number;
  questionsPerMatch: number;
  speedAttemptedRed: boolean;
  speedAttemptedBlue: boolean;
  isAdvancingSpeedQuestion: boolean;
  ropePosition: number;
  pullingTeamAnimation: 'red' | 'blue' | null;
  scoreNotice?: string | null;
  deviceTeam?: 'teacher' | 'red' | 'blue' | 'view';
  isFullscreen?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const GESTURE_ICONS = ['👆', '✌️', '🤟', '🖖'];

const GESTURE_EMOJIS: Record<number, string> = {
  1: '👆 1 Ngón (A)',
  2: '✌️ 2 Ngón (B)',
  3: '🤟 3 Ngón (C)',
  4: '🖖 4 Ngón (D)',
  5: '✋ 5 Ngón (Chờ)',
  0: '✊ Nắm tay'
};

export const CameraGestureDualZone: React.FC<CameraGestureDualZoneProps> = ({
  isEnabled,
  isQuestionStarted,
  playFormat,
  currentTurn,
  matchWinner,
  onRedAnswer,
  onBlueAnswer,
  redSelectedOption,
  blueSelectedOption,
  currentRedQuestionIdx,
  currentBlueQuestionIdx,
  holdDurationMs = 800,
  onToggleCamera,
  onStartMatch,
  onToggleFullscreen,
  onOpenConfig,
  timeLeft,
  isTimerRunning,
  onToggleTimer,
  currentQuestion,
  redScore,
  blueScore,
  redAnswerCount,
  blueAnswerCount,
  questionsPerMatch,
  speedAttemptedRed,
  speedAttemptedBlue,
  isAdvancingSpeedQuestion,
  ropePosition,
  pullingTeamAnimation,
  scoreNotice,
  deviceTeam = 'teacher',
  isFullscreen = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestAnimationRef = useRef<number | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Tracking state for Red Team
  const [redGesture, setRedGesture] = useState<{ fingers: number; optionIdx: number | null }>({ fingers: 0, optionIdx: null });
  const [redProgress, setRedProgress] = useState<number>(0); // 0 to 100
  const [redConfirmedOpt, setRedConfirmedOpt] = useState<number | null>(null);
  const redHoldStartRef = useRef<{ optionIdx: number; startTime: number } | null>(null);
  const redLastTriggeredQRef = useRef<number>(-1);

  // Tracking state for Blue Team
  const [blueGesture, setBlueGesture] = useState<{ fingers: number; optionIdx: number | null }>({ fingers: 0, optionIdx: null });
  const [blueProgress, setBlueProgress] = useState<number>(0); // 0 to 100
  const [blueConfirmedOpt, setBlueConfirmedOpt] = useState<number | null>(null);
  const blueHoldStartRef = useRef<{ optionIdx: number; startTime: number } | null>(null);
  const blueLastTriggeredQRef = useRef<number>(-1);

  // Reset confirmed state on new question
  useEffect(() => {
    setRedConfirmedOpt(null);
    setRedProgress(0);
    redHoldStartRef.current = null;
  }, [currentRedQuestionIdx, isQuestionStarted]);

  useEffect(() => {
    setBlueConfirmedOpt(null);
    setBlueProgress(0);
    blueHoldStartRef.current = null;
  }, [currentBlueQuestionIdx, isQuestionStarted]);

  // Count extended fingers from 21 landmarks
  const countFingers = (landmarks: Array<{ x: number; y: number; z: number }>): number => {
    if (!landmarks || landmarks.length < 21) return 0;

    let count = 0;

    // Index finger: Tip(8) is higher (smaller y) than PIP(6)
    const indexUp = landmarks[8].y < landmarks[6].y;
    if (indexUp) count++;

    // Middle finger: Tip(12) is higher than PIP(10)
    const middleUp = landmarks[12].y < landmarks[10].y;
    if (middleUp) count++;

    // Ring finger: Tip(16) is higher than PIP(14)
    const ringUp = landmarks[16].y < landmarks[14].y;
    if (ringUp) count++;

    // Pinky finger: Tip(20) is higher than PIP(18)
    const pinkyUp = landmarks[20].y < landmarks[18].y;
    if (pinkyUp) count++;

    // Thumb check: Thumb tip (4) vs IP joint (3) and MCP (2)
    const thumbDistToPinky = Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y);
    const thumbIpToPinky = Math.hypot(landmarks[3].x - landmarks[17].x, landmarks[3].y - landmarks[17].y);
    const thumbExtended = thumbDistToPinky > thumbIpToPinky * 1.15;
    
    if (thumbExtended && (count >= 1 || landmarks[4].y < landmarks[2].y)) {
      count++;
    }

    return count;
  };

  // Map finger count to Option Index (1 -> 0/A, 2 -> 1/B, 3 -> 2/C, 4 -> 3/D)
  const fingersToOptionIndex = (fingers: number): number | null => {
    if (fingers >= 1 && fingers <= 4) {
      return fingers - 1;
    }
    return null;
  };

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let isMounted = true;
    if (!isEnabled) return;

    const initMediaPipe = async () => {
      try {
        setIsLoadingModel(true);
        setCameraError(null);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!isMounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 4,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (isMounted) {
          handLandmarkerRef.current = landmarker;
          setIsLoadingModel(false);
        }
      } catch (err: any) {
        console.warn('MediaPipe HandLandmarker init error:', err);
        if (isMounted) {
          setIsLoadingModel(false);
          setCameraError('Không thể tải mô hình nhận diện tay AI: ' + (err.message || 'Vui lòng kiểm tra kết nối mạng'));
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [isEnabled]);

  // Start Camera Stream
  useEffect(() => {
    if (!isEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setCameraError(null);
        setIsPermissionDenied(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        let stream: MediaStream | null = null;

        // Try ideal resolution first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (firstErr: any) {
          console.warn('First camera constraint attempt failed, trying fallback...', firstErr);
          // Fallback to generic video stream
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        if (!isMounted || !stream) {
          if (stream) stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.warn);
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        if (isMounted) {
          const isDenied =
            err.name === 'NotAllowedError' ||
            err.name === 'PermissionDeniedError' ||
            String(err.message).toLowerCase().includes('permission') ||
            String(err.message).toLowerCase().includes('denied');

          setIsPermissionDenied(isDenied);
          setCameraError(
            isDenied
              ? 'Trình duyệt đang chặn quyền truy cập Camera (Permission denied).'
              : 'Không thể truy cập Camera: ' + (err.message || 'Vui lòng kiểm tra thiết bị Camera')
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isEnabled, facingMode, retryTrigger]);

  // Main Detection Loop
  const runDetection = useCallback(() => {
    if (!isEnabled || !videoRef.current || !canvasRef.current || !handLandmarkerRef.current) {
      requestAnimationRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState < 2) {
      requestAnimationRef.current = requestAnimationFrame(runDetection);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Detect Hands
    const startTimeMs = performance.now();
    const detections = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Draw Dual Zone Split Overlay
    const midX = width / 2;

    // 1. Left Zone: Blue Team (0 to midX)
    ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
    ctx.fillRect(0, 0, midX, height);

    // 2. Right Zone: Red Team (midX to width)
    ctx.fillStyle = 'rgba(225, 29, 72, 0.12)';
    ctx.fillRect(midX, 0, width - midX, height);

    // 3. Central Dividing Line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Zone Headers on Canvas
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('🔵 ĐỘI XANH', 20, 32);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('🔴 ĐỘI ĐỎ', midX + 20, 32);

    let detectedBlueFingers = 0;
    let detectedBlueOpt: number | null = null;
    let detectedRedFingers = 0;
    let detectedRedOpt: number | null = null;

    if (detections.landmarks && detections.landmarks.length > 0) {
      for (const landmarks of detections.landmarks) {
        const avgX = (landmarks[0].x + landmarks[9].x) / 2;
        const mirroredX = 1 - avgX; // 0 (left) to 1 (right)

        const fingerCount = countFingers(landmarks);
        const optIdx = fingersToOptionIndex(fingerCount);

        const isBlueSide = mirroredX < 0.5;
        const teamColor = isBlueSide ? '#38bdf8' : '#f87171';

        if (isBlueSide) {
          detectedBlueFingers = fingerCount;
          detectedBlueOpt = optIdx;
        } else {
          detectedRedFingers = fingerCount;
          detectedRedOpt = optIdx;
        }

        // Draw Hand Landmarks & Skeletons
        ctx.fillStyle = teamColor;
        ctx.strokeStyle = isBlueSide ? '#0284c7' : '#e11d48';
        ctx.lineWidth = 3;

        // Draw connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [5, 9], [9, 10], [10, 11], [11, 12], // Middle
          [9, 13], [13, 14], [14, 15], [15, 16], // Ring
          [13, 17], [17, 18], [18, 19], [19, 20], [0, 17] // Pinky
        ];

        for (const [startIdx, endIdx] of connections) {
          const start = landmarks[startIdx];
          const end = landmarks[endIdx];
          const sx = (1 - start.x) * width;
          const sy = start.y * height;
          const ex = (1 - end.x) * width;
          const ey = end.y * height;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // Draw key landmark circles
        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          const px = (1 - pt.x) * width;
          const py = pt.y * height;

          ctx.beginPath();
          const radius = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? 6 : 3.5;
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw Hand Label on Canvas
        const wristX = (1 - landmarks[0].x) * width;
        const wristY = Math.max(28, landmarks[0].y * height);
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#ffffff';
        const label = optIdx !== null ? `👉 Chọn ${OPTION_LETTERS[optIdx]}` : `${fingerCount} ngón`;
        ctx.fillText(label, wristX - 25, wristY - 12);
      }
    }

    setBlueGesture({ fingers: detectedBlueFingers, optionIdx: detectedBlueOpt });
    setRedGesture({ fingers: detectedRedFingers, optionIdx: detectedRedOpt });

    const now = Date.now();

    // ==================== BLUE TEAM HOLD LOGIC ====================
    const canBluePlay =
      isQuestionStarted &&
      !matchWinner &&
      !blueSelectedOption &&
      !isAdvancingSpeedQuestion &&
      (playFormat !== 'speed' || !speedAttemptedBlue) &&
      (playFormat !== 'turns' || currentTurn === 'blue') &&
      deviceTeam !== 'red' &&
      deviceTeam !== 'view';

    if (canBluePlay && detectedBlueOpt !== null && blueConfirmedOpt === null) {
      if (!blueHoldStartRef.current || blueHoldStartRef.current.optionIdx !== detectedBlueOpt) {
        blueHoldStartRef.current = { optionIdx: detectedBlueOpt, startTime: now };
        setBlueProgress(0);
      } else {
        const elapsed = now - blueHoldStartRef.current.startTime;
        const pct = Math.min(100, Math.round((elapsed / holdDurationMs) * 100));
        setBlueProgress(pct);

        if (pct >= 100 && blueLastTriggeredQRef.current !== currentBlueQuestionIdx) {
          setBlueConfirmedOpt(detectedBlueOpt);
          blueLastTriggeredQRef.current = currentBlueQuestionIdx;
          onBlueAnswer(detectedBlueOpt);
        }
      }
    } else {
      if (blueProgress > 0 && blueConfirmedOpt === null) {
        setBlueProgress(0);
        blueHoldStartRef.current = null;
      }
    }

    // ==================== RED TEAM HOLD LOGIC ====================
    const canRedPlay =
      isQuestionStarted &&
      !matchWinner &&
      !redSelectedOption &&
      !isAdvancingSpeedQuestion &&
      (playFormat !== 'speed' || !speedAttemptedRed) &&
      (playFormat !== 'turns' || currentTurn === 'red') &&
      deviceTeam !== 'blue' &&
      deviceTeam !== 'view';

    if (canRedPlay && detectedRedOpt !== null && redConfirmedOpt === null) {
      if (!redHoldStartRef.current || redHoldStartRef.current.optionIdx !== detectedRedOpt) {
        redHoldStartRef.current = { optionIdx: detectedRedOpt, startTime: now };
        setRedProgress(0);
      } else {
        const elapsed = now - redHoldStartRef.current.startTime;
        const pct = Math.min(100, Math.round((elapsed / holdDurationMs) * 100));
        setRedProgress(pct);

        if (pct >= 100 && redLastTriggeredQRef.current !== currentRedQuestionIdx) {
          setRedConfirmedOpt(detectedRedOpt);
          redLastTriggeredQRef.current = currentRedQuestionIdx;
          onRedAnswer(detectedRedOpt);
        }
      }
    } else {
      if (redProgress > 0 && redConfirmedOpt === null) {
        setRedProgress(0);
        redHoldStartRef.current = null;
      }
    }

    requestAnimationRef.current = requestAnimationFrame(runDetection);
  }, [
    isEnabled,
    isQuestionStarted,
    matchWinner,
    playFormat,
    currentTurn,
    redSelectedOption,
    blueSelectedOption,
    redConfirmedOpt,
    blueConfirmedOpt,
    currentRedQuestionIdx,
    currentBlueQuestionIdx,
    holdDurationMs,
    onRedAnswer,
    onBlueAnswer,
    blueProgress,
    redProgress,
    speedAttemptedRed,
    speedAttemptedBlue,
    isAdvancingSpeedQuestion,
    deviceTeam
  ]);

  useEffect(() => {
    if (isEnabled) {
      requestAnimationRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
    };
  }, [isEnabled, runDetection]);

  if (!isEnabled) {
    return null;
  }

  const optionsList = currentQuestion?.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];

  return (
    <div className={`w-full flex-1 flex flex-col justify-between bg-slate-950/98 border-2 border-amber-400/80 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in duration-300 ${
      isFullscreen ? 'p-2 sm:p-3 min-h-[calc(100vh-20px)]' : 'p-2.5 sm:p-3.5 min-h-[520px]'
    } space-y-2`}>
      {/* 1. ULTRA-COMPACT TOP HEADER & CONTROLS */}
      {isToolbarCollapsed ? (
        <div className="flex items-center justify-between gap-2 pb-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700 text-amber-300 font-black text-xs">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>📷 Camera AI: 1:A • 2:B • 3:C • 4:D</span>
            </div>

            {/* Countdown Timer Badge in Collapsed Toolbar */}
            {typeof timeLeft === 'number' && (
              <button
                onClick={onToggleTimer}
                className={`px-2.5 py-0.5 rounded-lg font-black text-xs flex items-center gap-1.5 shadow-sm border transition-all cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                    : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isTimerRunning ? 'Bấm để dừng đếm ngược' : 'Bấm để chạy đồng hồ đếm ngược'}
              >
                <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
                <span>⏰ {timeLeft}s</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsToolbarCollapsed(false)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Mở rộng thanh công cụ"
            >
              <span>⚙️ Hiện menu</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Toàn màn hình"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
            )}

            <button
              onClick={onToggleCamera}
              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              title="Tắt Camera"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Tắt</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-400 text-slate-950 font-black shadow-xs">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                THI ĐẤU CAMERA 2 ĐỘI
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                ⚡ Đúng trước ghi điểm
              </span>
              <span className="text-[11px] text-amber-100/80 font-bold hidden md:inline">
                (1:A • 2:B • 3:C • 4:D)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Cấu hình trận đấu */}
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Cấu hình thể thức thi đấu"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cấu hình</span>
              </button>
            )}

            {/* Realtime Countdown Timer Badge */}
            {typeof timeLeft === 'number' && (
              <button
                onClick={onToggleTimer}
                className={`px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 shadow-sm border transition-all cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                    : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isTimerRunning ? 'Bấm để dừng đếm ngược' : 'Bấm để chạy đồng hồ đếm ngược'}
              >
                <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
                <span>⏰ {timeLeft}s</span>
              </button>
            )}

            <button
              onClick={() => setIsToolbarCollapsed(true)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Thu gọn thanh công cụ"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thu gọn</span>
            </button>

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Toàn màn hình"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
            )}

            <button
              onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Đổi camera trước / sau"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đổi camera</span>
            </button>

            <button
              onClick={onToggleCamera}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
              title="Tắt chế độ Camera"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Tắt Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Loading or Error */}
      {isLoadingModel && (
        <div className="py-6 text-center text-amber-300 flex items-center justify-center gap-2 font-black text-sm animate-pulse bg-slate-900/90 rounded-2xl border border-amber-400/40">
          <Sparkles className="w-5 h-5 animate-spin text-amber-300" />
          <span>Đang kích hoạt mô hình AI nhận diện cử chỉ MediaPipe... Vui lòng chờ 2 giây</span>
        </div>
      )}

      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-950/95 border-3 border-rose-500 text-white text-xs sm:text-sm space-y-3 shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-black text-rose-200 text-base">
                {isPermissionDenied ? '⚠️ Trình duyệt chưa cấp quyền truy cập Camera' : '⚠️ Lỗi truy cập Camera'}
              </h5>
              <p className="text-rose-100/90 leading-relaxed font-bold">
                {cameraError}
              </p>
            </div>
          </div>

          {isPermissionDenied && (
            <div className="p-3.5 rounded-xl bg-slate-900/95 border border-amber-400/60 text-amber-200 text-xs sm:text-sm space-y-1.5">
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <span>💡 Cách bật quyền Camera (Rất nhanh):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-100 font-bold">
                <li>Bấm vào biểu tượng <strong>Ổ khóa 🔒</strong> hoặc <strong>Camera 📷</strong> ở đầu thanh địa chỉ trình duyệt.</li>
                <li>Tại mục <strong>Máy ảnh / Camera</strong>, chuyển sang <strong>Cho phép (Allow)</strong>.</li>
                <li>Bấm nút <strong>"🔄 Thử cấp quyền lại"</strong> bên dưới.</li>
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                setCameraError(null);
                setRetryTrigger((prev) => prev + 1);
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>🔄 Thử cấp quyền lại</span>
            </button>

            <button
              onClick={onToggleCamera}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>🎮 Tạm tắt Camera & chơi bằng Chuột / Cảm ứng</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= 2. KHUNG CÂU HỎI NẰM PHÍA TRÊN CAMERA (SIÊU NỔI BẬT & GỌN GÀNG) ================= */}
      {isQuestionStarted && currentQuestion ? (
        <div className="rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-rose-950 border-2 sm:border-3 border-amber-400/90 p-2.5 sm:p-3.5 shadow-2xl space-y-2 text-center relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/20 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1 shadow-lg animate-pulse">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>CÂU {redAnswerCount + 1}/{questionsPerMatch > 0 ? questionsPerMatch : '∞'}</span>
              </span>

              {/* Realtime Countdown Timer Badge Inside Question Header */}
              {typeof timeLeft === 'number' && (
                <button
                  onClick={onToggleTimer}
                  className={`px-3 py-1 rounded-full font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg border transition-all cursor-pointer active:scale-95 ${
                    isTimerRunning
                      ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse font-black'
                      : 'bg-slate-900 text-amber-300 border-amber-400/80 hover:bg-slate-800'
                  }`}
                  title={isTimerRunning ? 'Bấm để dừng đếm ngược' : 'Bấm để chạy đồng hồ đếm ngược'}
                >
                  <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
                  <span>⏰ {timeLeft}s</span>
                </button>
              )}
            </div>

            <span className="px-3 py-0.5 rounded-full bg-slate-900/90 border border-amber-400 text-amber-300 font-black text-[11px] sm:text-xs shadow-md">
              🎯 Đội giơ ngón tay đúng trước được +1 điểm & Kéo dây!
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400 font-black text-[11px] sm:text-xs">
              📚 {currentQuestion.subject || 'Tổng hợp'}
            </span>
          </div>

          <div className="p-2 sm:p-3 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xs">
            <h3 className="text-base sm:text-xl lg:text-2xl font-black text-amber-200 leading-snug drop-shadow-lg tracking-wide">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Realtime Action Score Notice */}
          {scoreNotice && (
            <div className="py-0.5 px-3 rounded-full bg-slate-950/90 border-2 border-amber-400 text-amber-300 text-xs font-black inline-block animate-bounce shadow-xl">
              {scoreNotice}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 sm:py-6 text-center bg-gradient-to-r from-sky-950/90 via-slate-900 to-rose-950/90 rounded-2xl border-2 sm:border-3 border-amber-400/80 shadow-2xl space-y-2.5 px-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-bounce">
            <Zap className="w-6 h-6 text-amber-300 fill-current" />
          </div>
          <h3 className="text-base sm:text-xl font-black text-amber-300 uppercase tracking-wide">
            🏆 SẴN SÀNG TRẬN ĐẤU KÉO CO CAMERA ({questionsPerMatch > 0 ? `${questionsPerMatch} CÂU` : 'VÔ HẠN'})
          </h3>
          <p className="text-xs font-extrabold text-slate-200 max-w-lg mx-auto">
            Người chơi 2 đội đứng trước Camera: 🔵 Đội Xanh (bên trái) và 🔴 Đội Đỏ (bên phải).
          </p>
          {deviceTeam === 'teacher' && onStartMatch && (
            <button
              onClick={onStartMatch}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 mx-auto ring-4 ring-amber-300/50"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>▶️ BẮT ĐẦU TRẬN ĐẤU NGAY</span>
            </button>
          )}
        </div>
      )}

      {/* ================= 3. BỐ CỤC 3 CỘT: 2 CỘT ĐÁP ÁN CHẠY DỌC 2 BÊN + CAMERA Ở GIỮA ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch flex-1">
        {/* ================= CỘT TRÁI: 🔵 ĐỘI XANH (4 ĐÁP ÁN THU GỌN, RÕ NÉT, TẬP TRUNG) ================= */}
        <div className="lg:col-span-3 bg-gradient-to-b from-[#0369a1]/95 via-[#075985]/95 to-[#082f49]/95 border-2 sm:border-3 border-sky-400 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-2xl space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-sky-300/40">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-300 animate-ping"></span>
              <h4 className="font-black text-sm sm:text-base text-white uppercase tracking-wider">🔵 Đội Xanh</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-lg">
              {blueScore} điểm
            </span>
          </div>

          {/* Speed Status Badge */}
          {speedAttemptedBlue && (
            <div className="py-1 px-2 rounded-lg bg-rose-950 text-rose-200 border border-rose-500 text-center text-[11px] font-black shadow-md">
              ❌ Đội Xanh đã trả lời sai câu này
            </div>
          )}

          {/* 4 Vertical Option Cards (Grouped, Clear, High Contrast) */}
          <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-2.5 py-1">
            {optionsList.map((opt, idx) => {
              const isGestureTarget = blueGesture.optionIdx === idx;
              const isSelected = blueSelectedOption?.idx === idx;
              const isCorrect = isSelected && blueSelectedOption?.result === 'correct';
              const isWrong = isSelected && blueSelectedOption?.result === 'wrong';
              const isDisabled =
                !isQuestionStarted ||
                !!matchWinner ||
                isAdvancingSpeedQuestion ||
                speedAttemptedBlue ||
                deviceTeam === 'red' ||
                deviceTeam === 'view';

              return (
                <button
                  key={idx}
                  onClick={() => onBlueAnswer(idx)}
                  disabled={isDisabled}
                  className={`w-full p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex items-center gap-2.5 shadow-md ${
                    isDisabled
                      ? 'bg-sky-950/80 border-sky-400/50 text-white opacity-95 cursor-default'
                      : 'cursor-pointer active:scale-98'
                  } ${
                    isCorrect
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-2xl ring-4 ring-emerald-300/80 animate-pulse'
                      : isWrong
                      ? 'bg-rose-700 border-rose-300 text-white shadow-2xl'
                      : isGestureTarget && blueProgress > 0 && !blueSelectedOption
                      ? 'bg-sky-950 border-amber-300 ring-3 ring-amber-300/70 shadow-2xl scale-[1.02]'
                      : !isDisabled
                      ? 'bg-gradient-to-r from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] border-sky-300/90 text-white hover:border-white'
                      : ''
                  }`}
                >
                  {/* Option Label & Gesture Icon Pill */}
                  <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-black/50 text-amber-300 border border-amber-300/40 shadow-xs">
                    <span className="text-sm sm:text-base font-black">{GESTURE_ICONS[idx]}</span>
                    <span className="font-black text-xs sm:text-sm">{OPTION_LETTERS[idx]}</span>
                  </div>

                  {/* Compact High Contrast Option Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm lg:text-[15px] font-black text-white leading-snug drop-shadow-sm line-clamp-2">
                      {opt}
                    </p>
                  </div>

                  {/* Percentage badge if gesture is active */}
                  {isGestureTarget && blueProgress > 0 && !blueSelectedOption && (
                    <span className="shrink-0 text-[11px] sm:text-xs font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-md animate-pulse">
                      {blueProgress}%
                    </span>
                  )}

                  {/* Hold Progress Bar embedded at bottom of card */}
                  {isGestureTarget && blueProgress > 0 && !blueSelectedOption && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-950/80 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                        style={{ width: `${blueProgress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= CỘT GIỮA: CAMERA DUAL ZONE (TOÀN MÀN HÌNH CAMERA) ================= */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-2">
          {/* Main Dual Zone Full-Height Camera Viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 sm:border-3 border-slate-700 shadow-2xl flex-1 min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex flex-col justify-between">
            {/* Hidden Raw Video (Used for MediaPipe Frame Processing) */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-90 pointer-events-none"
            />

            {/* Canvas for Skeleton & Zone Rendering */}
            <canvas
              ref={canvasRef}
              className="relative z-10 w-full h-full object-cover block"
            />

            {/* Dynamic Zone Overlays */}
            <div className="absolute inset-0 z-20 pointer-events-none flex">
              {/* Left Zone: Blue */}
              <div className="flex-1 p-2.5 sm:p-3 flex flex-col justify-between border-r-2 sm:border-r-3 border-dashed border-white/50 bg-sky-950/15">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-black text-xs sm:text-sm shadow-xl border border-sky-300/50 flex items-center gap-1">
                    <span>🔵 ĐỘI XANH</span>
                  </span>

                  {blueGesture.optionIdx !== null && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-2xl animate-bounce border border-amber-300">
                      {GESTURE_EMOJIS[blueGesture.fingers] || '✋'}
                    </span>
                  )}
                </div>

                {/* Bottom Status */}
                {blueConfirmedOpt !== null && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xl animate-pulse max-w-[200px] border-2 border-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ĐÃ CHỌN {OPTION_LETTERS[blueConfirmedOpt]}!</span>
                  </div>
                )}
              </div>

              {/* Right Zone: Red */}
              <div className="flex-1 p-2.5 sm:p-3 flex flex-col justify-between bg-rose-950/15">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs sm:text-sm shadow-xl border border-rose-300/50 flex items-center gap-1">
                    <span>🔴 ĐỘI ĐỎ</span>
                  </span>

                  {redGesture.optionIdx !== null && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-2xl animate-bounce border border-amber-300">
                      {GESTURE_EMOJIS[redGesture.fingers] || '✋'}
                    </span>
                  )}
                </div>

                {/* Bottom Status */}
                {redConfirmedOpt !== null && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-2xl animate-pulse max-w-[200px] ml-auto border-2 border-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ĐÃ CHỌN {OPTION_LETTERS[redConfirmedOpt]}!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sleek Live Tug-of-War HUD Rope Position Gauge */}
          <div className="bg-slate-950/95 border-2 sm:border-3 border-slate-700/90 rounded-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black">
              <span className="text-sky-400 flex items-center gap-1">
                <span>🔵 Đích Xanh</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">(-80px)</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                ropePosition < 0
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400 animate-pulse shadow-md'
                  : ropePosition > 0
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400 animate-pulse shadow-md'
                  : 'bg-slate-800 text-slate-200 border border-slate-600'
              }`}>
                {ropePosition < 0 ? `👈 Xanh kéo dây +${Math.abs(ropePosition)}px` : ropePosition > 0 ? `Đỏ kéo dây +${ropePosition}px 👉` : '⚖️ Vạch giữa cân bằng (0px)'}
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-300">(+80px)</span>
                <span>🔴 Đích Đỏ</span>
              </span>
            </div>

            {/* Visual Rope Bar with Animated Ribbon Marker */}
            <div className="relative h-6 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center">
              {/* Rope Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-950/60 via-amber-950/40 to-rose-950/60" />
              {/* Center Target Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-emerald-400 z-10 -translate-x-1/2 shadow-xs" />
              
              {/* Animated Moving Tug Knot / Red Ribbon */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-300 flex items-center justify-center"
                style={{
                  left: `${Math.max(10, Math.min(90, 50 + (ropePosition / 80) * 40))}%`
                }}
              >
                <div className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-xl flex items-center gap-1 ring-1 ring-amber-300">
                  <span>🎀 Dây Kéo</span>
                  <span>({ropePosition > 0 ? `+${ropePosition}` : ropePosition < 0 ? `${ropePosition}` : '0'}px)</span>
                </div>
              </div>
            </div>

            {matchWinner && (
              <div className="rounded-xl bg-amber-400 text-slate-950 font-black text-center p-2.5 text-sm sm:text-base animate-bounce shadow-2xl mt-1 ring-2 ring-amber-300/60">
                🏆 {matchWinner === 'red' ? '🔴 ĐỘI ĐỎ CHIẾN THẮNG!' : '🔵 ĐỘI XANH CHIẾN THẮNG!'}
              </div>
            )}
          </div>
        </div>

        {/* ================= CỘT PHẢI: 🔴 ĐỘI ĐỎ (4 ĐÁP ÁN THU GỌN, RÕ NÉT, TẬP TRUNG) ================= */}
        <div className="lg:col-span-3 bg-gradient-to-b from-[#be123c]/95 via-[#9f1239]/95 to-[#4c0519]/95 border-2 sm:border-3 border-rose-400 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-2xl space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-rose-300/40">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-300 animate-ping"></span>
              <h4 className="font-black text-sm sm:text-base text-white uppercase tracking-wider">🔴 Đội Đỏ</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-lg">
              {redScore} điểm
            </span>
          </div>

          {/* Speed Status Badge */}
          {speedAttemptedRed && (
            <div className="py-1 px-2 rounded-lg bg-rose-950 text-rose-200 border border-rose-500 text-center text-[11px] font-black shadow-md">
              ❌ Đội Đỏ đã trả lời sai câu này
            </div>
          )}

          {/* 4 Vertical Option Cards (Grouped, Clear, High Contrast) */}
          <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-2.5 py-1">
            {optionsList.map((opt, idx) => {
              const isGestureTarget = redGesture.optionIdx === idx;
              const isSelected = redSelectedOption?.idx === idx;
              const isCorrect = isSelected && redSelectedOption?.result === 'correct';
              const isWrong = isSelected && redSelectedOption?.result === 'wrong';
              const isDisabled =
                !isQuestionStarted ||
                !!matchWinner ||
                isAdvancingSpeedQuestion ||
                speedAttemptedRed ||
                deviceTeam === 'blue' ||
                deviceTeam === 'view';

              return (
                <button
                  key={idx}
                  onClick={() => onRedAnswer(idx)}
                  disabled={isDisabled}
                  className={`w-full p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex items-center gap-2.5 shadow-md ${
                    isDisabled
                      ? 'bg-rose-950/80 border-rose-400/50 text-white opacity-95 cursor-default'
                      : 'cursor-pointer active:scale-98'
                  } ${
                    isCorrect
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-2xl ring-4 ring-emerald-300/80 animate-pulse'
                      : isWrong
                      ? 'bg-rose-700 border-rose-300 text-white shadow-2xl'
                      : isGestureTarget && redProgress > 0 && !redSelectedOption
                      ? 'bg-rose-950 border-amber-300 ring-3 ring-amber-300/70 shadow-2xl scale-[1.02]'
                      : !isDisabled
                      ? 'bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#be123c] hover:to-[#9f1239] border-rose-300/90 text-white hover:border-white'
                      : ''
                  }`}
                >
                  {/* Option Label & Gesture Icon Pill */}
                  <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-black/50 text-amber-300 border border-amber-300/40 shadow-xs">
                    <span className="text-sm sm:text-base font-black">{GESTURE_ICONS[idx]}</span>
                    <span className="font-black text-xs sm:text-sm">{OPTION_LETTERS[idx]}</span>
                  </div>

                  {/* Compact High Contrast Option Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm lg:text-[15px] font-black text-white leading-snug drop-shadow-sm line-clamp-2">
                      {opt}
                    </p>
                  </div>

                  {/* Percentage badge if gesture is active */}
                  {isGestureTarget && redProgress > 0 && !redSelectedOption && (
                    <span className="shrink-0 text-[11px] sm:text-xs font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-md animate-pulse">
                      {redProgress}%
                    </span>
                  )}

                  {/* Hold Progress Bar embedded at bottom of card */}
                  {isGestureTarget && redProgress > 0 && !redSelectedOption && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-950/80 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                        style={{ width: `${redProgress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
