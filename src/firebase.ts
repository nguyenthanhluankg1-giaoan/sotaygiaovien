import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import fileConfig from '../firebase-applet-config.json';

// Support both embedded json config and Vercel/Vite environment variables
const env = (import.meta as any).env || {};
export const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || fileConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || fileConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain,
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID ||
    fileConfig.firestoreDatabaseId ||
    'ai-studio-hsgiodc-44aadd2f-354d-4302-9b97-d002d1ac93ec',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || fileConfig.measurementId || '',
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || fileConfig.oAuthClientId || '',
  recaptchaSiteKey: env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || fileConfig.recaptchaSiteKey || ''
};

export const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

// Initialize Firestore with auto-detect long-polling to prevent connection errors across proxy/iframe networks
const targetDbId =
  resolvedFirebaseConfig.firestoreDatabaseId && resolvedFirebaseConfig.firestoreDatabaseId !== '(default)'
    ? resolvedFirebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true
    },
    targetDbId
  );
} catch (e) {
  firestoreInstance = getFirestore(app, targetDbId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

/**
 * Kiểm tra kết nối trực tiếp đến Cloud Firestore (hỗ trợ cả Vercel và Google Studio)
 */
export async function testFirestoreLiveConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  databaseId?: string;
  error?: string;
}> {
  const start = Date.now();
  try {
    const testDoc = doc(db, 'system', 'connection_test');
    await setDoc(testDoc, { lastPing: new Date().toISOString() }, { merge: true });
    const snap = await getDoc(testDoc);
    const latencyMs = Date.now() - start;
    return {
      connected: snap.exists(),
      latencyMs,
      databaseId: resolvedFirebaseConfig.firestoreDatabaseId
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      connected: false,
      latencyMs,
      databaseId: resolvedFirebaseConfig.firestoreDatabaseId,
      error: err?.message || 'Không thể kết nối đến Firestore'
    };
  }
}

// Test connection gracefully without blocking UI on initial load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreLiveConnection().then((res) => {
      if (res.connected) {
        console.log(`[Cloud Firestore] Kết nối thành công (${res.latencyMs}ms) - DB: ${res.databaseId}`);
      } else {
        console.warn(`[Cloud Firestore] Chế độ lưu trữ cục bộ: ${res.error}`);
      }
    }).catch(() => {
      // Gracefully silent on transient offline
    });
  }, 1200);
}


