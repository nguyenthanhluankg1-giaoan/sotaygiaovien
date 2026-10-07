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

export function playWrongSound(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;

    const now = ac.currentTime;

    // Note 1: Low descending failure buzz (200Hz -> 120Hz)
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + 0.18);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2: Lower "uh-oh" buzz (150Hz -> 80Hz)
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(150, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.45);
    gain2.gain.setValueAtTime(0.25, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore audio errors
  }
}

export function playApplauseSound(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;

    const now = ac.currentTime;

    // 1. Cheerful chime arpeggio: C5 -> E5 -> G5 -> C6
    const chimeNotes = [523.25, 659.25, 783.99, 1046.5];
    chimeNotes.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.22, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });

    // 2. Synthesized applause / audience clapping noise
    const bufferSize = Math.floor(ac.sampleRate * 0.85);
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ac.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(1.2, now);

    const noiseGain = ac.createGain();
    const clapTimes = [0.05, 0.11, 0.17, 0.23, 0.3, 0.37, 0.44, 0.51, 0.58, 0.66, 0.74];
    noiseGain.gain.setValueAtTime(0, now);
    clapTimes.forEach((t) => {
      noiseGain.gain.setValueAtTime(0.2 + Math.random() * 0.1, now + t);
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + t + 0.045);
    });

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ac.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.85);
  } catch {
    // Ignore audio errors
  }
}

export function playCelebration(): void {
  try {
    playApplauseSound();
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
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
