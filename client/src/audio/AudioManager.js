/**
 * AudioManager — A simple singleton wrapper for HTML5 Audio.
 * Gracefully handles missing files to prevent game crashes.
 */
class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.3; // Default BGM volume
    this.isMuted = false;
    
    // We'll define paths. If the file doesn't exist, it simply won't play.
    this.soundPaths = {
      click: '/sounds/click.mp3',
      jump: '/sounds/jump.mp3',
      step: '/sounds/step.mp3',
      attack: '/sounds/attack.mp3',
      pickup: '/sounds/pickup.mp3',
      steal: '/sounds/steal.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
    };

    this.bgmPaths = {
      lobby: '/sounds/bgm_lobby.mp3',
      game: '/sounds/bgm_game.mp3',
    };
  }

  /**
   * Preloads an audio file and stores it in the map.
   */
  preload(key, path) {
    const audio = new Audio();
    audio.src = path;
    // Don't throw errors on missing files, just ignore
    audio.onerror = () => {
      console.warn(`[AudioManager] Missing audio file: ${path}`);
    };
    this.sounds.set(key, audio);
  }

  init() {
    // Preload all registered SFX
    Object.entries(this.soundPaths).forEach(([key, path]) => {
      this.preload(key, path);
    });
  }

  /**
   * Play a one-shot sound effect.
   */
  play(key, volume = 0.5) {
    if (this.isMuted) return;
    const sound = this.sounds.get(key);
    if (!sound) return;
    
    // Clone node so overlapping sounds can play simultaneously
    const clone = sound.cloneNode();
    clone.volume = volume;
    clone.play().catch(() => {
      // Browsers block autoplay until user interacts. Ignore the error.
    });
  }

  /**
   * Play or switch background music.
   */
  playBGM(trackKey) {
    if (this.isMuted) {
      this.bgmAudio.pause();
      return;
    }
    
    const path = this.bgmPaths[trackKey];
    if (!path) return;

    if (this.bgmAudio.src.includes(path) && !this.bgmAudio.paused) {
      return; // Already playing this track
    }

    this.bgmAudio.src = path;
    this.bgmAudio.play().catch(() => {
      // Ignored: usually due to missing interaction
    });
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.bgmAudio.pause();
    } else {
      // Resume if it has a source
      if (this.bgmAudio.src) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }
}

export const audioManager = new AudioManager();
