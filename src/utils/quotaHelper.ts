const QUOTA_KEY = 'firestore_quota_exceeded_date';
const QUOTA_TIMESTAMP_KEY = 'firestore_quota_exceeded_timestamp';
const QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

let quotaExceededState = false;

export function isFirestoreQuotaExceeded(): boolean {
  if (quotaExceededState) return true;
  try {
    const tsRaw = localStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (tsRaw) {
      const ts = Number(tsRaw);
      if (!isNaN(ts) && Date.now() - ts < QUOTA_COOLDOWN_MS) {
        quotaExceededState = true;
        return true;
      }
    }
    // Legacy fallback check
    const savedDate = localStorage.getItem(QUOTA_KEY);
    if (savedDate) {
      quotaExceededState = true;
      return true;
    }
  } catch (e) {}
  return false;
}

// Initial script-load check
try {
  if (typeof localStorage !== 'undefined') {
    const tsRaw = localStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (tsRaw && Date.now() - Number(tsRaw) < QUOTA_COOLDOWN_MS) {
      quotaExceededState = true;
    }
  }
} catch (e) {}

let quotaExceededListeners: Array<() => void> = [];

export function onQuotaExceeded(listener: () => void) {
  quotaExceededListeners.push(listener);
  if (isFirestoreQuotaExceeded()) {
    try {
      listener();
    } catch (e) {}
  }
}

export function checkAndMarkQuotaExceeded(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || String(err);
  const code = err?.code;
  if (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('Quota exceeded') ||
    msg.toLowerCase().includes('quota')
  ) {
    if (!quotaExceededState) {
      quotaExceededState = true;
      try {
        localStorage.setItem(QUOTA_TIMESTAMP_KEY, String(Date.now()));
        localStorage.setItem(QUOTA_KEY, new Date().toISOString().split('T')[0]);
      } catch (e) {}
      console.warn('[Cloud Firestore] Daily write quota limit reached (resource-exhausted). System seamlessly operating in high-performance local storage mode.');
      quotaExceededListeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
    }
    return true;
  }
  return false;
}

export function resetQuotaState(): void {
  quotaExceededState = false;
  try {
    localStorage.removeItem(QUOTA_KEY);
    localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
  } catch (e) {}
}

// Global auto-detection listener for unhandled Firestore quota errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event && event.reason) {
      checkAndMarkQuotaExceeded(event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (event && (event.error || event.message)) {
      checkAndMarkQuotaExceeded(event.error || event.message);
    }
  });
}

