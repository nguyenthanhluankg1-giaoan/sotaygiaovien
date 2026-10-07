import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Hand, AlertCircle, RefreshCw, Eye, EyeOff, Move, Minus, Maximize2 } from 'lucide-react';
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

type CameraCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

// Helper DOM highlight functions for instant visual feedback without React re-render overhead
function highlightDockCard(targetDockId: string | null) {
  const dockElements = document.querySelectorAll('.dock-card-item');
  dockElements.forEach((el) => {
    const dockId = el.getAttribute('data-dock-id');
    if (targetDockId && dockId === targetDockId) {
      el.classList.add('ring-4', 'ring-amber-400', 'scale-105', 'shadow-2xl', 'brightness-110');
    } else {
      el.classList.remove('ring-4', 'ring-amber-400', 'scale-105', 'shadow-2xl', 'brightness-110');
    }
  });
}

function highlightTargetSlot(targetZoneId: string | null) {
  const targetElements = document.querySelectorAll('.target-drop-zone');
  targetElements.forEach((el) => {
    const targetId = el.getAttribute('data-target-id');
    if (targetZoneId && targetId === targetZoneId) {
      el.classList.add('ring-4', 'ring-emerald-400', 'bg-emerald-950/80', 'scale-105');
    } else {
      el.classList.remove('ring-4', 'ring-emerald-400', 'bg-emerald-950/80', 'scale-105');
    }
  });
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
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const miniDotRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Camera Position & View Modes
  const [cameraCorner, setCameraCorner] = useState<CameraCorner>('bottom-right');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Status & Hand Tracking UI State
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [grabbedItem, setGrabbedItem] = useState<DragDropPair | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(true);

  // Refs for stable callback & state access without triggering effect re-runs
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
  const isHandDetectedRef = useRef<boolean>(false);
  const lostFramesCountRef = useRef<number>(0);

  // Nearest targets for ultra-easy proximity grabbing & dropping
  const nearestDockItemRef = useRef<DragDropPair | null>(null);
  const nearestTargetIdRef = useRef<string | null>(null);

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
    if (grabbedItem && !dockItems.some((i) => i.id === grabbedItem.id)) {
      setGrabbedItem(null);
      highlightDockCard(null);
      highlightTargetSlot(null);
    }
  }, [dockItems, grabbedItem]);

  // Rotate camera box corner position
  const cycleCameraCorner = () => {
    const corners: CameraCorner[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const nextIdx = (corners.indexOf(cameraCorner) + 1) % corners.length;
    setCameraCorner(corners[nextIdx]);
  };

  // Main Camera & HandLandmarker Loop: ONLY depends on isCameraActive!
  useEffect(() => {
    if (!isCameraActive) {
      setInitStatus('idle');
      setIsHandDetected(false);
      setIsPinching(false);
      setGrabbedItem(null);
      isHandDetectedRef.current = false;
      currentPinchRef.current = false;
      prevPinchingRef.current = false;
      lostFramesCountRef.current = 0;
      highlightDockCard(null);
      highlightTargetSlot(null);
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

        // 1. Request Camera MediaStream
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
                const hasLandmarks = results && results.landmarks && results.landmarks.length > 0;

                if (hasLandmarks) {
                  lostFramesCountRef.current = 0;
                  const landmarks = results.landmarks[0];

                  const gestureState = computePinchState(landmarks, currentPinchRef.current);

                  // Responsive Palm-Center smoothing (80% new position, 20% previous) for instant response
                  smoothXRef.current = smoothXRef.current * 0.2 + gestureState.handX * 0.8;
                  smoothYRef.current = smoothYRef.current * 0.2 + gestureState.handY * 0.8;

                  const nextX = Math.round(smoothXRef.current * 1000) / 1000;
                  const nextY = Math.round(smoothYRef.current * 1000) / 1000;

                  // Update hand detection state only on state change
                  if (!isHandDetectedRef.current) {
                    isHandDetectedRef.current = true;
                    setIsHandDetected(true);
                  }

                  currentPinchRef.current = gestureState.isPinching;
                  if (prevPinchingRef.current !== gestureState.isPinching) {
                    setIsPinching(gestureState.isPinching);
                  }

                  // Update hardware-accelerated pointer positions directly via DOM (0 React re-renders)
                  if (arenaRef.current) {
                    const rect = arenaRef.current.getBoundingClientRect();
                    const cursorClientX = rect.left + nextX * rect.width;
                    const cursorClientY = rect.top + nextY * rect.height;

                    if (pointerRef.current) {
                      pointerRef.current.style.transform = `translate3d(${cursorClientX}px, ${cursorClientY}px, 0px)`;
                    }

                    if (miniDotRef.current) {
                      miniDotRef.current.style.left = `${nextX * 100}%`;
                      miniDotRef.current.style.top = `${nextY * 100}%`;
                    }

                    // Auto See-Through Translucency: If hand cursor is near camera widget, fade widget to 20% opacity
                    if (widgetRef.current) {
                      const widgetRect = widgetRef.current.getBoundingClientRect();
                      const widgetCenterX = widgetRect.left + widgetRect.width / 2;
                      const widgetCenterY = widgetRect.top + widgetRect.height / 2;
                      const distToWidget = Math.hypot(cursorClientX - widgetCenterX, cursorClientY - widgetCenterY);

                      if (distToWidget < 260) {
                        widgetRef.current.style.opacity = '0.2';
                        widgetRef.current.style.pointerEvents = 'none';
                      } else {
                        widgetRef.current.style.opacity = '1.0';
                        widgetRef.current.style.pointerEvents = 'auto';
                      }
                    }

                    const elementsUnderCursor = document.elementsFromPoint(cursorClientX, cursorClientY);

                    // A. FIND NEAREST DOCK CARD (When NOT carrying an item)
                    if (!grabbedItemRef.current) {
                      let foundDockItem: DragDropPair | null = null;

                      // 1. Direct overlap
                      for (const el of elementsUnderCursor) {
                        const dockId = el.getAttribute('data-dock-id');
                        if (dockId) {
                          foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          if (foundDockItem) break;
                        }
                      }

                      // 2. Ultra-generous proximity radius (within 280px of hand)
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

                          if (dist < 280 && dist < minDistance) {
                            minDistance = dist;
                            foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          }
                        });
                      }

                      nearestDockItemRef.current = foundDockItem;
                      highlightDockCard(foundDockItem ? foundDockItem.id : null);
                      highlightTargetSlot(null);
                    } else {
                      // B. FIND NEAREST TARGET DROP ZONE (When CARRYING an item)
                      let currentTargetId: string | null = null;

                      // 1. Direct overlap
                      for (const el of elementsUnderCursor) {
                        const targetId = el.getAttribute('data-target-id');
                        if (targetId) {
                          currentTargetId = targetId;
                          break;
                        }
                      }

                      // 2. Proximity radius (within 250px of hand)
                      if (!currentTargetId) {
                        const targetElements = Array.from(document.querySelectorAll('.target-drop-zone'));
                        let minDistance = Infinity;

                        targetElements.forEach((el) => {
                          const targetId = el.getAttribute('data-target-id');
                          if (!targetId) return;
                          const elRect = el.getBoundingClientRect();
                          const centerX = elRect.left + elRect.width / 2;
                          const centerY = elRect.top + elRect.height / 2;
                          const dist = Math.hypot(cursorClientX - centerX, cursorClientY - centerY);

                          if (dist < 250 && dist < minDistance) {
                            minDistance = dist;
                            currentTargetId = targetId;
                          }
                        });
                      }

                      nearestTargetIdRef.current = currentTargetId;
                      highlightDockCard(null);
                      highlightTargetSlot(currentTargetId);
                    }

                    // GESTURE TRIGGER 1: Full Fist / Pinch Close (NẮM CẢ BÀN TAY / ✊)
                    if (gestureState.isPinching && !prevPinchingRef.current) {
                      const itemToGrab = nearestDockItemRef.current;
                      if (itemToGrab) {
                        setGrabbedItem(itemToGrab);
                        if (soundEnabledRef.current && playTickRef.current) {
                          playTickRef.current();
                        }
                      }
                    }

                    // GESTURE TRIGGER 2: Open Hand Release (XÒE BÀN TAY / 🖐)
                    if (!gestureState.isPinching && prevPinchingRef.current) {
                      const currentGrabbed = grabbedItemRef.current;
                      const targetToDrop = nearestTargetIdRef.current;

                      if (currentGrabbed && targetToDrop) {
                        onAttemptMatchRef.current(currentGrabbed, targetToDrop);
                      }
                      setGrabbedItem(null);
                      highlightDockCard(null);
                      highlightTargetSlot(null);
                    }
                  }

                  prevPinchingRef.current = gestureState.isPinching;
                } else {
                  // Buffer missing landmarks for 12 frames (~200ms) to prevent dropping grab during minor camera flickers
                  lostFramesCountRef.current += 1;
                  if (lostFramesCountRef.current > 12) {
                    if (isHandDetectedRef.current) {
                      isHandDetectedRef.current = false;
                      setIsHandDetected(false);
                      setIsPinching(false);
                      setGrabbedItem(null);
                      isHandDetectedRef.current = false;
                      currentPinchRef.current = false;
                      prevPinchingRef.current = false;
                      highlightDockCard(null);
                      highlightTargetSlot(null);
                    }
                  }
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
      highlightDockCard(null);
      highlightTargetSlot(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive, arenaRef]);

  if (!isCameraActive) return null;

  const cornerPositionClass = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }[cameraCorner];

  return (
    <>
      {/* 1. Camera Status Banner & Live Stream Widget with Auto-Translucency & Position Switcher */}
      <div
        ref={widgetRef}
        className={`fixed ${cornerPositionClass} z-[1000] flex flex-col items-end gap-2 transition-all duration-300 max-w-xs`}
      >
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
                Camera Tay ✊
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Corner Switcher Button */}
              <button
                type="button"
                onClick={cycleCameraCorner}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                title={`Chuyển vị trí góc camera (Hiện tại: ${cameraCorner})`}
              >
                <Move className="w-3 h-3" />
                <span className="hidden sm:inline text-[9px]">Đổi góc</span>
              </button>

              {/* Minimize/Maximize Button */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title={isMinimized ? 'Mở rộng camera' : 'Thu nhỏ camera'}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              </button>

              {/* Video Preview Toggle */}
              <button
                type="button"
                onClick={() => setShowVideoPreview(!showVideoPreview)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title={showVideoPreview ? 'Ẩn khung video' : 'Hiện khung video'}
              >
                {showVideoPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>

              {/* Close Camera Button */}
              <button
                type="button"
                onClick={onToggleCamera}
                className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                title="Tắt Camera"
              >
                <CameraOff className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Status Message */}
              {initStatus === 'loading' && (
                <div className="flex items-center gap-2 text-xs text-amber-300 py-1 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span>Đang kết nối camera & nhận diện bàn tay...</span>
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
                        {isPinching ? '✊ ĐANG NẮM HÌNH' : '🖐 XÒE TAY SẴN SÀNG'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${isPinching ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                        {isPinching ? 'Nắm cả bàn tay ✊' : 'Xòe bàn tay 🖐'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-amber-300 font-bold bg-amber-950/40 p-2 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                      <Hand className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                      <span>Giơ bàn tay trước camera (Xòe / Nắm tay)!</span>
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
                {showVideoPreview && (
                  <div
                    ref={miniDotRef}
                    className="absolute w-4 h-4 rounded-full bg-amber-400 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none transition-none"
                    style={{ left: '50%', top: '50%' }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Virtual Hand Cursor Pointer & Floating Image Overlay (Direct Hardware Accelerated DOM Transform) */}
      {initStatus === 'ready' && isHandDetected && (
        <div className="pointer-events-none fixed inset-0 z-[1100]">
          <div
            ref={pointerRef}
            className="absolute left-0 top-0 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-none"
            style={{ transform: 'translate3d(0px, 0px, 0px)' }}
          >
            {/* Visual Hand Cursor Icon */}
            <div
              className={`p-3.5 rounded-full border-4 shadow-2xl transition-all duration-150 flex items-center justify-center ${
                isPinching
                  ? 'bg-amber-400 border-amber-300 text-slate-950 scale-125 ring-8 ring-amber-400/50 shadow-amber-500/50'
                  : 'bg-teal-500/95 border-white text-white scale-100 ring-4 ring-teal-400/40'
              }`}
            >
              {isPinching ? (
                <span className="text-3xl animate-pulse select-none">✊</span>
              ) : (
                <span className="text-3xl select-none">🖐</span>
              )}
            </div>

            {/* Gesture Tooltip Banner */}
            <div className={`mt-2 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xl backdrop-blur-md border border-white/30 uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              isPinching ? 'bg-amber-500 text-slate-950 scale-105' : 'bg-slate-900/95 text-white'
            }`}>
              {grabbedItem ? (
                <>
                  <span>✊ ĐANG NẮM: {grabbedItem.caption || grabbedItem.targetLabel}</span>
                  <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-extrabold">Kéo xuống & Xòe tay 🖐</span>
                </>
              ) : isPinching ? (
                <span>✊ Đã nắm cả bàn tay</span>
              ) : (
                <span>🖐 NẮM CẢ BÀN TAY ✊ ĐỂ NHẮC HÌNH</span>
              )}
            </div>

            {/* Floating Grabbed Card Preview */}
            {grabbedItem && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-900/95 border-4 border-amber-400 ring-4 ring-amber-400/40 shadow-2xl flex flex-col items-center justify-center animate-bounce min-w-[130px]">
                {grabbedItem.imageType === 'upload' || (grabbedItem.image && (grabbedItem.image.startsWith('data:image') || grabbedItem.image.startsWith('http'))) ? (
                  <img
                    src={grabbedItem.image}
                    alt={grabbedItem.caption || grabbedItem.targetLabel}
                    className="w-24 h-24 object-contain rounded-xl drop-shadow-md"
                  />
                ) : (
                  <span className="text-5xl select-none drop-shadow-md">{grabbedItem.image}</span>
                )}
                <span className="text-xs font-black text-amber-300 mt-1.5 text-center">
                  Di chuyển đến đáp án & XÒE TAY 🖐 để thả!
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
