import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Sparkles, RefreshCw, CheckCircle2, Hand, Info, Minimize2, Maximize2, Zap, AlertCircle } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

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
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
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
  onToggleCamera
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
    // Distance between thumb tip and pinky base vs thumb IP and pinky base
    const thumbDistToPinky = Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y);
    const thumbIpToPinky = Math.hypot(landmarks[3].x - landmarks[17].x, landmarks[3].y - landmarks[17].y);
    const thumbExtended = thumbDistToPinky > thumbIpToPinky * 1.15;
    
    // Only count thumb if at least index is also up or when thumb is part of 3/5 fingers
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
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('🔵 ĐỘI XANH', 24, 38);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('🔴 ĐỘI ĐỎ', midX + 24, 38);

    let detectedBlueFingers = 0;
    let detectedBlueOpt: number | null = null;
    let detectedRedFingers = 0;
    let detectedRedOpt: number | null = null;

    if (detections.landmarks && detections.landmarks.length > 0) {
      for (const landmarks of detections.landmarks) {
        // Calculate wrist / palm center X coordinate
        // Note: Video is mirrored horizontally via CSS, so we invert X for canvas drawing coordinates
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
          // Mirror X coordinates on Canvas
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
          const radius = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? 7 : 4;
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw Hand Label on Canvas
        const wristX = (1 - landmarks[0].x) * width;
        const wristY = Math.max(30, landmarks[0].y * height);
        ctx.font = 'black 16px sans-serif';
        ctx.fillStyle = '#ffffff';
        const label = optIdx !== null ? `👉 Chọn ${OPTION_LETTERS[optIdx]}` : `${fingerCount} ngón`;
        ctx.fillText(label, wristX - 30, wristY - 15);
      }
    }

    setBlueGesture({ fingers: detectedBlueFingers, optionIdx: detectedBlueOpt });
    setRedGesture({ fingers: detectedRedFingers, optionIdx: detectedRedOpt });

    const now = Date.now();

    // ==================== BLUE TEAM HOLD LOGIC ====================
    const canBluePlay = isQuestionStarted && !matchWinner && !blueSelectedOption && (playFormat !== 'turns' || currentTurn === 'blue');
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
    const canRedPlay = isQuestionStarted && !matchWinner && !redSelectedOption && (playFormat !== 'turns' || currentTurn === 'red');
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
    redProgress
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

  return (
    <div className="bg-slate-900/95 border-2 border-amber-400/70 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-3 relative overflow-hidden animate-in fade-in duration-300">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
              <span>📷 CAMERA AI NHẬN DIỆN CỬ CHỈ 2 ĐỘI</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold">
                Live 2 Khung Hình
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              1 ngón = A • 2 ngón = B • 3 ngón = C • 4 ngón = D (Giữ cử chỉ 0.8s để chọn)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
            title="Đổi camera trước / sau"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đổi camera</span>
          </button>

          <button
            onClick={() => setIsCompact(!isCompact)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title={isCompact ? 'Mở rộng camera' : 'Thu nhỏ camera'}
          >
            {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleCamera}
            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1 transition-all shadow-md cursor-pointer"
            title="Tắt Camera"
          >
            <CameraOff className="w-3.5 h-3.5" />
            <span>Tắt</span>
          </button>
        </div>
      </div>

      {/* Camera Loading or Error */}
      {isLoadingModel && (
        <div className="py-6 text-center text-amber-300 flex items-center justify-center gap-2 font-bold text-xs animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Đang tải mô hình nhận diện tay AI MediaPipe... Vui lòng chờ 2 giây</span>
        </div>
      )}

      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500/80 text-white text-xs space-y-3 shadow-xl">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-black text-rose-200 text-sm">
                {isPermissionDenied ? '⚠️ Trình duyệt chưa cấp quyền truy cập Camera' : '⚠️ Lỗi truy cập Camera'}
              </h5>
              <p className="text-rose-100/90 text-[11px] leading-relaxed">
                {cameraError}
              </p>
            </div>
          </div>

          {/* Step-by-step instruction for unlocking permission */}
          {isPermissionDenied && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-400/40 text-amber-200 text-[11px] space-y-1.5">
              <div className="font-black text-amber-300 flex items-center gap-1.5">
                <span>💡 Cách bật quyền Camera (Rất nhanh):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-200">
                <li>
                  Bấm vào biểu tượng <strong>Ổ khóa 🔒</strong> hoặc <strong>Camera 📷</strong> ở đầu thanh địa chỉ trình duyệt (Address Bar).
                </li>
                <li>
                  Tại mục <strong>Máy ảnh / Camera</strong>, chuyển sang <strong>Cho phép (Allow)</strong>.
                </li>
                <li>
                  Bấm nút <strong>"🔄 Thử cấp quyền lại"</strong> bên dưới.
                </li>
              </ol>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => {
                setCameraError(null);
                setRetryTrigger((prev) => prev + 1);
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🔄 Thử cấp quyền lại</span>
            </button>

            <button
              onClick={onToggleCamera}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>🎮 Tạm tắt Camera & chơi bằng Chuột / Cảm ứng</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Dual Zone Camera Stage */}
      <div className={`relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-inner transition-all ${
        isCompact ? 'max-h-[160px] sm:max-h-[200px]' : 'max-h-[280px] sm:max-h-[380px]'
      }`}>
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

        {/* Dynamic Zone Overlays & Feedback Badges */}
        <div className="absolute inset-0 z-20 pointer-events-none flex">
          {/* ================= LEFT HALF: BLUE TEAM ================= */}
          <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between border-r-2 border-dashed border-white/40 bg-sky-950/10">
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-sky-600/90 text-white font-black text-xs shadow-md backdrop-blur-xs flex items-center gap-1">
                <span>🔵 ĐỘI XANH</span>
              </span>

              {blueGesture.optionIdx !== null && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-lg animate-bounce">
                  {GESTURE_EMOJIS[blueGesture.fingers] || '✋'}
                </span>
              )}
            </div>

            {/* Bottom Detection Feedback & Hold Bar */}
            <div className="space-y-1.5 max-w-[200px]">
              {blueProgress > 0 && blueConfirmedOpt === null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-sky-200">
                    <span>Đang chọn {OPTION_LETTERS[blueGesture.optionIdx || 0]}...</span>
                    <span>{blueProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-sky-400/50">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-75"
                      style={{ width: `${blueProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {blueConfirmedOpt !== null && (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-lg animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ĐÃ CHỌN ĐÁP ÁN {OPTION_LETTERS[blueConfirmedOpt]}!</span>
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT HALF: RED TEAM ================= */}
          <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between bg-rose-950/10">
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-rose-600/90 text-white font-black text-xs shadow-md backdrop-blur-xs flex items-center gap-1">
                <span>🔴 ĐỘI ĐỎ</span>
              </span>

              {redGesture.optionIdx !== null && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-lg animate-bounce">
                  {GESTURE_EMOJIS[redGesture.fingers] || '✋'}
                </span>
              )}
            </div>

            {/* Bottom Detection Feedback & Hold Bar */}
            <div className="space-y-1.5 max-w-[200px] ml-auto">
              {redProgress > 0 && redConfirmedOpt === null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-rose-200">
                    <span>Đang chọn {OPTION_LETTERS[redGesture.optionIdx || 0]}...</span>
                    <span>{redProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-rose-400/50">
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 to-emerald-400 transition-all duration-75"
                      style={{ width: `${redProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {redConfirmedOpt !== null && (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-lg animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ĐÃ CHỌN ĐÁP ÁN {OPTION_LETTERS[redConfirmedOpt]}!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
