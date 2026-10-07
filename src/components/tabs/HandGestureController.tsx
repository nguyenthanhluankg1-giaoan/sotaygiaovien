import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Hand, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { DragDropPair } from '../../types';
import { computePinchState, initHandLandmarker } from '../../utils/handGesture';

interface HandGestureControllerProps {
  isCameraActive: boolean;
  onToggleCamera: () => void;
  dockItems: DragDropPair[];
  onAttemptMatch: (item: DragDropPair, targetId: string) => void;
  soundEnabled: boolean;
  playTick: () => void;
  arenaRef: React.RefObject<HTMLDivElement | null>;
}

export const HandGestureController: React.FC<HandGestureControllerProps> = ({
  isCameraActive,
  onToggleCamera,
  dockItems,
  onAttemptMatch,
  soundEnabled,
  playTick,
  arenaRef
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Status & Hand Tracking UI State
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [handPos, setHandPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [grabbedItem, setGrabbedItem] = useState<DragDropPair | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(true);

  // Refs for stable callback access inside requestAnimationFrame loop without re-triggering camera setup
  const onAttemptMatchRef = useRef(onAttemptMatch);
  const playTickRef = useRef(playTick);
  const soundEnabledRef = useRef(soundEnabled);
  const dockItemsRef = useRef<DragDropPair[]>(dockItems);
  const grabbedItemRef = useRef<DragDropPair | null>(null);

  // Smooth movement & gesture state refs
  const smoothXRef = useRef<number>(0.5);
  const smoothYRef = useRef<number>(0.5);
  const currentPinchRef = useRef<boolean>(false);
  const prevPinchingRef = useRef<boolean>(false);

  useEffect(() => {
    onAttemptMatchRef.current = onAttemptMatch;
  }, [onAttemptMatch]);

  useEffect(() => {
    playTickRef.current = playTick;
  }, [playTick]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    grabbedItemRef.current = grabbedItem;
  }, [grabbedItem]);

  useEffect(() => {
    dockItemsRef.current = dockItems;
    // If grabbed item was placed into a target slot, clear grabbed state
    if (grabbedItem && !dockItems.some((i) => i.id === grabbedItem.id)) {
      setGrabbedItem(null);
    }
  }, [dockItems, grabbedItem]);

  // Main Camera & HandLandmarker Loop: ONLY depends on isCameraActive!
  useEffect(() => {
    if (!isCameraActive) {
      setInitStatus('idle');
      setIsHandDetected(false);
      setGrabbedItem(null);
      currentPinchRef.current = false;
      prevPinchingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let stream: MediaStream | null = null;
    let isSubscribed = true;

    async function setupCameraAndAI() {
      try {
        setInitStatus('loading');
        setErrorMessage('');

        // 1. Request Camera MediaStream with standard parameters
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        if (!isSubscribed) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 2. Initialize MediaPipe HandLandmarker
        const landmarker = await initHandLandmarker();
        if (!landmarker) {
          throw new Error('Không thể khởi tạo mô hình AI nhận diện bàn tay. Vui lòng thử lại.');
        }

        if (!isSubscribed) return;
        setInitStatus('ready');

        // 3. Process video frames in animation loop
        let lastVideoTime = -1;

        const processFrame = () => {
          if (!isSubscribed) return;

          if (videoRef.current && videoRef.current.readyState >= 2) {
            const video = videoRef.current;
            if (video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;

              try {
                const results = landmarker.detectForVideo(video, performance.now());
                if (results && results.landmarks && results.landmarks.length > 0) {
                  const landmarks = results.landmarks[0];
                  // Pass current pinch state to enforce hysteresis and prevent flickering
                  const gestureState = computePinchState(landmarks, currentPinchRef.current);

                  // Exponential smoothing (low-pass filter) for jitter-free cursor tracking
                  smoothXRef.current = smoothXRef.current * 0.55 + gestureState.handX * 0.45;
                  smoothYRef.current = smoothYRef.current * 0.55 + gestureState.handY * 0.45;

                  const nextX = Math.round(smoothXRef.current * 1000) / 1000;
                  const nextY = Math.round(smoothYRef.current * 1000) / 1000;

                  setIsHandDetected(true);
                  setHandPos({ x: nextX, y: nextY });

                  currentPinchRef.current = gestureState.isPinching;
                  setIsPinching(gestureState.isPinching);

                  // Calculate screen coordinates for hit testing against game cards/slots
                  if (arenaRef.current) {
                    const rect = arenaRef.current.getBoundingClientRect();
                    const cursorClientX = rect.left + nextX * rect.width;
                    const cursorClientY = rect.top + nextY * rect.height;

                    const elementsUnderCursor = document.elementsFromPoint(cursorClientX, cursorClientY);

                    // Find if cursor is currently over a target drop zone
                    let currentTargetId: string | null = null;
                    for (const el of elementsUnderCursor) {
                      const targetId = el.getAttribute('data-target-id');
                      if (targetId) {
                        currentTargetId = targetId;
                        break;
                      }
                    }

                    // GESTURE TRIGGER 1: Pinch START (User closes fingers to GRAB image)
                    if (gestureState.isPinching && !prevPinchingRef.current) {
                      let foundDockItem: DragDropPair | null = null;

                      // Check direct element overlap
                      for (const el of elementsUnderCursor) {
                        const dockId = el.getAttribute('data-dock-id');
                        if (dockId) {
                          foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          if (foundDockItem) break;
                        }
                      }

                      // Proximity check: find nearest available dock card within 120px
                      if (!foundDockItem && dockItemsRef.current.length > 0) {
                        const dockElements = Array.from(document.querySelectorAll('.dock-card-item'));
                        let minDistance = Infinity;

                        dockElements.forEach((el) => {
                          const dockId = el.getAttribute('data-dock-id');
                          if (!dockId) return;
                          const elRect = el.getBoundingClientRect();
                          const centerX = elRect.left + elRect.width / 2;
                          const centerY = elRect.top + elRect.height / 2;
                          const dist = Math.hypot(cursorClientX - centerX, cursorClientY - centerY);

                          if (dist < 120 && dist < minDistance) {
                            minDistance = dist;
                            foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          }
                        });
                      }

                      if (foundDockItem) {
                        setGrabbedItem(foundDockItem);
                        if (soundEnabledRef.current && playTickRef.current) {
                          playTickRef.current();
                        }
                      }
                    }

                    // GESTURE TRIGGER 2: Pinch END (User opens fingers to DROP image)
                    if (!gestureState.isPinching && prevPinchingRef.current) {
                      const currentGrabbed = grabbedItemRef.current;
                      if (currentGrabbed && currentTargetId) {
                        onAttemptMatchRef.current(currentGrabbed, currentTargetId);
                      }
                      setGrabbedItem(null);
                    }
                  }

                  prevPinchingRef.current = gestureState.isPinching;
                } else {
                  setIsHandDetected(false);
                  setIsPinching(false);
                  currentPinchRef.current = false;
                  prevPinchingRef.current = false;
                }
              } catch (err) {
                console.warn('Frame detection warning:', err);
              }
            }
          }

          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        if (!isSubscribed) return;
        setInitStatus('error');
        setErrorMessage(
          err?.message || 'Không thể kết nối Camera. Vui lòng cho phép quyền truy cập Camera trong trình duyệt.'
        );
      }
    }

    setupCameraAndAI();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive, arenaRef]);

  if (!isCameraActive) return null;

  return (
    <>
      {/* 1. Camera Status Banner & Live Stream Widget */}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col items-end gap-2 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="bg-slate-900/95 border-2 border-amber-400/80 shadow-2xl rounded-2xl p-3 text-white backdrop-blur-md w-full space-y-2">
          {/* Header & Controls */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHandDetected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isHandDetected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-xs font-black tracking-wide text-amber-300 uppercase flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                Camera Nắm Bàn Tay
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowVideoPreview(!showVideoPreview)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title={showVideoPreview ? 'Ẩn màn hình camera' : 'Hiện màn hình camera'}
              >
                {showVideoPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onToggleCamera}
                className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                title="Tắt Camera"
              >
                <CameraOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status Message */}
          {initStatus === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-amber-300 py-1 font-bold">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>Đang kết nối camera & kích hoạt AI nhận diện bàn tay...</span>
            </div>
          )}

          {initStatus === 'error' && (
            <div className="space-y-1 text-xs text-rose-300 py-1">
              <div className="flex items-center gap-1 font-bold text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Không thể kết nối Camera</span>
              </div>
              <p className="text-[11px] text-slate-300">{errorMessage}</p>
            </div>
          )}

          {initStatus === 'ready' && (
            <div className="text-xs space-y-1">
              {isHandDetected ? (
                <div className="flex items-center justify-between text-emerald-300 font-extrabold bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                  <span className="flex items-center gap-1.5">
                    {isPinching ? '✊ ĐANG NẮM HÌNH' : '🖐 BÀN TAY ĐÃ SẴN SÀNG'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                    {isPinching ? 'Chụm ngón' : 'Mở tay'}
                  </span>
                </div>
              ) : (
                <div className="text-amber-300 font-bold bg-amber-950/40 p-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                  <Hand className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                  <span>Giơ bàn tay trước camera để điều khiển!</span>
                </div>
              )}
            </div>
          )}

          {/* Video element */}
          <div className={`relative rounded-xl overflow-hidden bg-black border border-slate-700 ${showVideoPreview ? 'h-32 w-full mt-1' : 'h-0 w-0 border-0'}`}>
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {isHandDetected && showVideoPreview && (
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none transition-all duration-75"
                style={{
                  left: `${handPos.x * 100}%`,
                  top: `${handPos.y * 100}%`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Virtual Hand Cursor Pointer & Floating Image Overlay */}
      {initStatus === 'ready' && isHandDetected && arenaRef.current && (
        <div className="pointer-events-none fixed inset-0 z-[1100]">
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-75 ease-out"
            style={{
              left: `${arenaRef.current.getBoundingClientRect().left + handPos.x * arenaRef.current.getBoundingClientRect().width}px`,
              top: `${arenaRef.current.getBoundingClientRect().top + handPos.y * arenaRef.current.getBoundingClientRect().height}px`
            }}
          >
            {/* Visual Hand Cursor Icon */}
            <div
              className={`p-3 rounded-full border-4 shadow-2xl transition-all duration-150 flex items-center justify-center ${
                isPinching
                  ? 'bg-amber-400 border-amber-300 text-slate-950 scale-125 ring-8 ring-amber-400/50 shadow-amber-500/50'
                  : 'bg-teal-500/90 border-white text-white scale-100 ring-4 ring-teal-400/40'
              }`}
            >
              {isPinching ? (
                <span className="text-2xl animate-pulse">✊</span>
              ) : (
                <span className="text-2xl">🖐</span>
              )}
            </div>

            {/* Gesture Tooltip Banner */}
            <div className={`mt-1.5 px-3 py-1 rounded-full text-xs font-black shadow-lg backdrop-blur-md border border-white/20 uppercase tracking-wider transition-all ${
              isPinching ? 'bg-amber-500 text-slate-950 scale-105' : 'bg-slate-900/90 text-white'
            }`}>
              {grabbedItem
                ? `✊ Đang nắm: ${grabbedItem.caption || grabbedItem.targetLabel}`
                : isPinching
                ? '✊ Đang chụm tay'
                : '🖐 Chụm 2 ngón tay để NẮM hình'}
            </div>

            {/* Floating Grabbed Card Preview */}
            {grabbedItem && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-900/95 border-4 border-amber-400 ring-4 ring-amber-400/40 shadow-2xl flex flex-col items-center justify-center animate-bounce min-w-[120px]">
                {grabbedItem.imageType === 'upload' || (grabbedItem.image && (grabbedItem.image.startsWith('data:image') || grabbedItem.image.startsWith('http'))) ? (
                  <img
                    src={grabbedItem.image}
                    alt={grabbedItem.caption || grabbedItem.targetLabel}
                    className="w-20 h-20 object-contain rounded-xl drop-shadow-md"
                  />
                ) : (
                  <span className="text-4xl select-none drop-shadow-md">{grabbedItem.image}</span>
                )}
                <span className="text-xs font-black text-amber-300 mt-1">
                  Di chuyển đến ô đáp án & XÒE TAY để thả!
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
