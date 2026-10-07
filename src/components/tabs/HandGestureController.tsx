import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Hand, Sparkles, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
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

  // Status & Hand Tracking State
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [handPos, setHandPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [grabbedItem, setGrabbedItem] = useState<DragDropPair | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(true);

  // Ref to store previous pinching state to detect gesture transitions
  const prevPinchingRef = useRef<boolean>(false);
  const grabbedItemRef = useRef<DragDropPair | null>(null);
  const dockItemsRef = useRef<DragDropPair[]>(dockItems);

  useEffect(() => {
    grabbedItemRef.current = grabbedItem;
  }, [grabbedItem]);

  useEffect(() => {
    dockItemsRef.current = dockItems;
    // If grabbed item was placed, clear grabbed state
    if (grabbedItem && !dockItems.some((i) => i.id === grabbedItem.id)) {
      setGrabbedItem(null);
    }
  }, [dockItems, grabbedItem]);

  // Initialize and run hand tracking when isCameraActive is true
  useEffect(() => {
    if (!isCameraActive) {
      setInitStatus('idle');
      setIsHandDetected(false);
      setGrabbedItem(null);
      setHoveredTargetId(null);
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

        // 1. Get Camera MediaStream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });

        if (!isSubscribed) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 2. Load MediaPipe Hand Landmarker
        const landmarker = await initHandLandmarker();
        if (!landmarker) {
          throw new Error('Không thể tải mô hình AI nhận diện bàn tay. Vui lòng kiểm tra kết nối mạng.');
        }

        if (!isSubscribed) return;
        setInitStatus('ready');

        // 3. Process video frames
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
                  const state = computePinchState(landmarks);

                  setIsHandDetected(true);
                  setHandPos({ x: state.handX, y: state.handY });
                  setIsPinching(state.isPinching);

                  // Calculate screen coordinates for hit testing
                  if (arenaRef.current) {
                    const rect = arenaRef.current.getBoundingClientRect();
                    const cursorClientX = rect.left + state.handX * rect.width;
                    const cursorClientY = rect.top + state.handY * rect.height;

                    // Find elements under cursor
                    const elementsUnderCursor = document.elementsFromPoint(cursorClientX, cursorClientY);

                    // Check for target drop zones under hand cursor
                    let currentTargetId: string | null = null;
                    for (const el of elementsUnderCursor) {
                      const targetId = el.getAttribute('data-target-id');
                      if (targetId) {
                        currentTargetId = targetId;
                        break;
                      }
                    }
                    setHoveredTargetId(currentTargetId);

                    // GESTURE TRIGGER 1: Pinch START (User closes fingers to grab)
                    if (state.isPinching && !prevPinchingRef.current) {
                      // Find if cursor is over a dock card or near a dock card
                      let foundDockItem: DragDropPair | null = null;

                      for (const el of elementsUnderCursor) {
                        const dockId = el.getAttribute('data-dock-id');
                        if (dockId) {
                          foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          if (foundDockItem) break;
                        }
                      }

                      // Fallback: If no direct element, check distance to nearest dock card
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

                          if (dist < 100 && dist < minDistance) {
                            minDistance = dist;
                            foundDockItem = dockItemsRef.current.find((i) => i.id === dockId) || null;
                          }
                        });
                      }

                      if (foundDockItem) {
                        setGrabbedItem(foundDockItem);
                        if (soundEnabled) playTick();
                      }
                    }

                    // GESTURE TRIGGER 2: Pinch END (User opens fingers to drop)
                    if (!state.isPinching && prevPinchingRef.current) {
                      const currentGrabbed = grabbedItemRef.current;
                      if (currentGrabbed && currentTargetId) {
                        onAttemptMatch(currentGrabbed, currentTargetId);
                      }
                      setGrabbedItem(null);
                    }
                  }

                  prevPinchingRef.current = state.isPinching;
                } else {
                  setIsHandDetected(false);
                  setIsPinching(false);
                  setHoveredTargetId(null);
                  prevPinchingRef.current = false;
                }
              } catch (err) {
                console.warn('Frame detection error:', err);
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
          err?.message || 'Không thể mở Camera. Vui lòng cấp quyền truy cập Camera trong trình duyệt.'
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
  }, [isCameraActive, arenaRef, soundEnabled, playTick, onAttemptMatch]);

  if (!isCameraActive) return null;

  return (
    <>
      {/* 1. Camera Status Banner & Miniature Stream Widget */}
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
            <div className="flex items-center gap-2 text-xs text-amber-300 py-1">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Đang kết nối camera & tải AI nhận diện bàn tay...</span>
            </div>
          )}

          {initStatus === 'error' && (
            <div className="space-y-1 text-xs text-rose-300 py-1">
              <div className="flex items-center gap-1 font-bold text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Chưa mở được Camera</span>
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
                  <span>Hãy giơ bàn tay lên trước camera để điều khiển!</span>
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
                className="absolute w-3 h-3 rounded-full bg-amber-400 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all duration-75 pointer-events-none"
                style={{
                  left: `${handPos.x * 100}%`,
                  top: `${handPos.y * 100}%`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Virtual Hand Cursor & Floating Image Overlay on Game Arena */}
      {initStatus === 'ready' && isHandDetected && arenaRef.current && (
        <div className="pointer-events-none fixed inset-0 z-[1100]">
          {/* Hand Cursor Pointer */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out flex flex-col items-center"
            style={{
              left: `${arenaRef.current.getBoundingClientRect().left + handPos.x * arenaRef.current.getBoundingClientRect().width}px`,
              top: `${arenaRef.current.getBoundingClientRect().top + handPos.y * arenaRef.current.getBoundingClientRect().height}px`
            }}
          >
            {/* Visual Hand Icon */}
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
