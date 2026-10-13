let quotaExceededState = false;

export function isFirestoreQuotaExceeded(): boolean {
  return quotaExceededState;
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
    quotaExceededState = true;
    console.warn('[Cloud Firestore] Quota limit reached or exceeded. Automatically operating in local storage mode.');
    return true;
  }
  return false;
}
