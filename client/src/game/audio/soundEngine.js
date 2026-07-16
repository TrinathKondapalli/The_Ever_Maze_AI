class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.heartbeatOsc = null;
    this.heartbeatGain = null;
    this.isInitialized = false;
    this.lastFootstepTime = 0;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5; // Master volume
    this.masterGain.connect(this.ctx.destination);
    
    this.isInitialized = true;
    
    // Unsuspend if needed
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playFootstep() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Debounce footsteps to prevent machine-gun sound
    if (now - this.lastFootstepTime < 0.25) return;
    this.lastFootstepTime = now;

    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like a dull thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  playPickup() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playTag() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playAlarm() {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Play 3 pulses
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.5);
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, startTime);
      osc.frequency.linearRampToValueAtTime(300, startTime + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    }
  }

  startHeartbeat() {
    if (!this.isInitialized || !this.ctx || this.heartbeatOsc) return;
    
    // Heartbeat is a slow repeating oscillator modifying a gain node
    this.heartbeatOsc = this.ctx.createOscillator();
    this.heartbeatOsc.type = 'sine';
    this.heartbeatOsc.frequency.value = 50; // Low bass frequency
    
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.5; // 1.5 beats per second
    
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.gain.value = 0; // modulated by LFO

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.5;

    lfo.connect(lfoGain);
    lfoGain.connect(this.heartbeatGain.gain);
    
    this.heartbeatOsc.connect(this.heartbeatGain);
    this.heartbeatGain.connect(this.masterGain);

    this.heartbeatOsc.start();
    lfo.start();
    
    // Keep reference to LFO to stop it later
    this.heartbeatOsc.lfo = lfo;
  }

  stopHeartbeat() {
    if (this.heartbeatOsc) {
      this.heartbeatOsc.stop();
      if (this.heartbeatOsc.lfo) this.heartbeatOsc.lfo.stop();
      this.heartbeatOsc.disconnect();
      this.heartbeatOsc = null;
    }
    if (this.heartbeatGain) {
      this.heartbeatGain.disconnect();
      this.heartbeatGain = null;
    }
  }
}

// Export a singleton instance
export const soundEngine = new SoundEngine();
