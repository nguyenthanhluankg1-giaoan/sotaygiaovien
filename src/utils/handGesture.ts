import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarkerInstance: HandLandmarker | null = null;
let isInitializing = false;

async function resolveVisionTasks() {
  const cdnUrls = [
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  ];

  for (const url of cdnUrls) {
    try {
      const vision = await FilesetResolver.forVisionTasks(url);
      if (vision) return vision;
    } catch (err) {
      console.warn(`FilesetResolver failed for ${url}, trying next CDN...`, err);
    }
  }
  throw new Error('Không thể tải thư viện nhận diện cử chỉ MediaPipe Vision Tasks từ CDN.');
}

export async function initHandLandmarker(): Promise<HandLandmarker | null> {
  if (landmarkerInstance) return landmarkerInstance;
  if (isInitializing) {
    // Wait for ongoing initialization
    let waitCount = 0;
    while (isInitializing && waitCount < 30) {
      await new Promise((r) => setTimeout(r, 100));
      waitCount++;
      if (landmarkerInstance) return landmarkerInstance;
    }
  }

  try {
    isInitializing = true;
    const vision = await resolveVisionTasks();

    // 1. Try GPU delegate
    try {
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
    } catch (gpuErr) {
      console.warn('GPU HandLandmarker failed, trying CPU fallback...', gpuErr);
      // 2. Fallback to CPU delegate
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
    }
  } catch (err) {
    isInitializing = false;
    console.error('HandLandmarker init error:', err);
    return null;
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
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // Palm center anchor (average of Wrist + MCP joints)
  const palmX = (wrist.x + indexMcp.x + middleMcp.x + pinkyMcp.x) / 4;
  const palmY = (wrist.y + indexMcp.y + middleMcp.y + pinkyMcp.y) / 4;
  const palmZ = ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0) + (pinkyMcp.z || 0)) / 4;

  // Mirrored X for natural camera mirror
  const handX = Math.max(0, Math.min(1, 1 - palmX));
  const handY = Math.max(0, Math.min(1, palmY));

  // Palm width reference distance (Index MCP 5 to Pinky MCP 17) - invariant to finger posture
  const palmWidth = Math.hypot(
    indexMcp.x - pinkyMcp.x,
    indexMcp.y - pinkyMcp.y,
    (indexMcp.z || 0) - (pinkyMcp.z || 0)
  ) || 0.12;

  // Distances from fingertips to palm center
  const dIndexPalm = Math.hypot(indexTip.x - palmX, indexTip.y - palmY, (indexTip.z || 0) - palmZ);
  const dMiddlePalm = Math.hypot(middleTip.x - palmX, middleTip.y - palmY, (middleTip.z || 0) - palmZ);
  const dRingPalm = Math.hypot(ringTip.x - palmX, ringTip.y - palmY, (ringTip.z || 0) - palmZ);
  const dPinkyPalm = Math.hypot(pinkyTip.x - palmX, pinkyTip.y - palmY, (pinkyTip.z || 0) - palmZ);

  // Ratio of average fingertip distance relative to palm width
  const avgTipRatio = (dIndexPalm + dMiddlePalm + dRingPalm + dPinkyPalm) / 4 / palmWidth;

  // Pinch distance (Thumb tip to Index tip or Middle tip) relative to palm width
  const dPinchThumbIndex = Math.hypot(
    thumbTip.x - indexTip.x,
    thumbTip.y - indexTip.y,
    (thumbTip.z || 0) - (indexTip.z || 0)
  );
  const pinchDistance = dPinchThumbIndex / palmWidth;

  // Fist closed check (avgTipRatio < 1.35)
  const isFistClosed = avgTipRatio < 1.35;

  // Hysteresis for grab/release gesture:
  // - To START grab (Nắm tay): Fist closed (avgTipRatio < 1.35) OR 2-finger Pinch (pinchDistance < 0.55)
  // - To RELEASE grab (Xòe tay): Open hand (avgTipRatio > 1.60 AND pinchDistance > 0.65)
  let isPinching = currentIsPinching;
  if (!currentIsPinching) {
    if (avgTipRatio < 1.35 || pinchDistance < 0.55) {
      isPinching = true;
    }
  } else {
    if (avgTipRatio > 1.60 && pinchDistance > 0.65) {
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
