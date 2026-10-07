import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarkerInstance: HandLandmarker | null = null;
let isInitializing = false;

export async function initHandLandmarker(): Promise<HandLandmarker | null> {
  if (landmarkerInstance) return landmarkerInstance;
  if (isInitializing) {
    // Wait for ongoing initialization
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
      if (landmarkerInstance) return landmarkerInstance;
    }
  }

  try {
    isInitializing = true;
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1
    });

    isInitializing = false;
    return landmarkerInstance;
  } catch (err) {
    console.warn('Failed GPU HandLandmarker, trying CPU fallback...', err);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });
      isInitializing = false;
      return landmarkerInstance;
    } catch (cpuErr) {
      isInitializing = false;
      console.error('HandLandmarker init error:', cpuErr);
      return null;
    }
  }
}

export interface HandGestureState {
  isHandDetected: boolean;
  handX: number; // 0 to 1 normalized (mirrored)
  handY: number; // 0 to 1 normalized
  isPinching: boolean; // true when index and thumb are pinched
  pinchDistance: number;
}

export function computePinchState(landmarks: Array<{ x: number; y: number; z: number }>): HandGestureState {
  if (!landmarks || landmarks.length < 9) {
    return {
      isHandDetected: false,
      handX: 0.5,
      handY: 0.5,
      isPinching: false,
      pinchDistance: 1
    };
  }

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  // Mirrored X for natural camera interaction
  const handX = 1 - indexTip.x;
  const handY = indexTip.y;

  // Calculate 2D distance between thumb tip and index tip
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const pinchDistance = Math.hypot(dx, dy);

  // Threshold for pinch gesture (around 0.08 normalized distance)
  const isPinching = pinchDistance < 0.085;

  return {
    isHandDetected: true,
    handX,
    handY,
    isPinching,
    pinchDistance
  };
}
