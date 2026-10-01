let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playBeep(freq = 660, duration = 0.18, volume = 0.12): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Ignore audio playback errors if restricted by browser policy
  }
}

export function playTick(): void {
  playBeep(900, 0.05, 0.05);
}

export function playAlarm(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playBeep(freq, 0.25, 0.15);
      }, idx * 120);
    });
  } catch {
    // Fallback
  }
}

export function playCelebration(): void {
  try {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playBeep(freq, 0.2, 0.15);
      }, idx * 90);
    });
  } catch {
    // Fallback
  }
}

export function playAlertSound(type: 'shh' | 'loud' | 'stop' | 'great'): void {
  if (type === 'great') {
    playCelebration();
  } else if (type === 'shh') {
    playBeep(480, 0.2, 0.1);
  } else if (type === 'loud') {
    playBeep(380, 0.35, 0.18);
  } else if (type === 'stop') {
    playBeep(320, 0.45, 0.22);
  }
}
