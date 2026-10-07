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
  isPinching: boolean; // true when fist is closed or 2 fingers pinched (Nắm tay)
  isFistClosed: boolean;
  pinchDistance: number;
}

export function computePinchState(
  landmarks: Array<{ x: number; y: number; z: number }>,
  currentIsPinching: boolean = false
): HandGestureState {
  if (!landmarks || landmarks.length < 21) {
    return {
      isHandDetected: false,
      handX: 0.5,
      handY: 0.5,
      isPinching: false,
      isFistClosed: false,
      pinchDistance: 1
    };
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // Palm center anchor (landmark 0 + 9 average) stays extremely stable when making a fist
  const palmX = (wrist.x + middleMcp.x) / 2;
  const palmY = (wrist.y + middleMcp.y) / 2;

  // Mirrored X for natural camera mirror
  const handX = Math.max(0, Math.min(1, 1 - palmX));
  const handY = Math.max(0, Math.min(1, palmY));

  // Hand scale (wrist to middle MCP distance)
  const handScale = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y) || 0.15;

  // Calculate finger extensions relative to hand scale
  const dIndex = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
  const dMiddle = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
  const dRing = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
  const dPinky = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

  // Normalized average finger extension (Open hand ~1.8 - 2.5, Closed fist ~0.9 - 1.35)
  const avgFingerExtension = (dIndex + dMiddle + dRing + dPinky) / 4 / handScale;

  // 2-finger pinch distance relative to hand scale
  const dPinchRaw = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  const pinchDistance = dPinchRaw / handScale;

  // Fist closed state
  const isFistClosed = avgFingerExtension < 1.42;

  // Hysteresis thresholding for grab gesture (combines Full Fist Grab & Pinch):
  // - To START grab: require full fist close (avgExtension < 1.42) OR pinch (pinchDistance < 0.45)
  // - To RELEASE grab: require opening hand wide (avgExtension > 1.65 AND pinchDistance > 0.55)
  let isPinching = currentIsPinching;
  if (!currentIsPinching) {
    if (avgFingerExtension < 1.42 || pinchDistance < 0.45) {
      isPinching = true;
    }
  } else {
    if (avgFingerExtension > 1.65 && pinchDistance > 0.55) {
      isPinching = false;
    }
  }

  return {
    isHandDetected: true,
    handX,
    handY,
    isPinching,
    isFistClosed,
    pinchDistance
  };
}
