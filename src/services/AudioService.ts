/**
 * AudioService — synthesized sound effects + text-to-speech announcer
 * 
 * TTS Fix: voices load asynchronously on most browsers. We queue speech
 * until voices are confirmed loaded, and re-check on every speak() call.
 */

type SpeechQueueItem = {
  text: string
  priority: 'normal' | 'high'
}

class AudioService {
  private ctx: AudioContext | null = null
  private voices: SpeechSynthesisVoice[] = []
  private voicesLoaded = false
  private speechQueue: SpeechQueueItem[] = []
  private isSpeaking = false
  private _muted = false

  constructor() {
    // Eagerly attempt to load voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices()
      // Chrome fires this event asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices()
      }
    }
  }

  private loadVoices() {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) {
      this.voices = v
      this.voicesLoaded = true
      // Process any queued speech
      this.processQueue()
    }
  }

  get muted() { return this._muted }

  set muted(val: boolean) {
    this._muted = val
    if (val) {
      window.speechSynthesis?.cancel()
      this.speechQueue = []
      this.isSpeaking = false
    }
  }

  private initAudio() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
  }

  resume() {
    this.initAudio()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.initAudio()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)

    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  playScore() {
    if (this._muted) return
    this.playTone(523.25, 'sine', 0.08, 0.08)
    setTimeout(() => this.playTone(659.25, 'sine', 0.08, 0.08), 60)
  }

  playWin() {
    if (this._muted) return
    const tones = [523.25, 659.25, 783.99, 1046.50]
    tones.forEach((t, i) => {
      setTimeout(() => this.playTone(t, 'triangle', 0.4, 0.08), i * 100)
    })
  }

  playUndo() {
    if (this._muted) return
    this.playTone(330, 'sine', 0.15, 0.06)
  }

  /**
   * Pick the best available voice — prefer natural/female English voices
   */
  private getBestVoice(): SpeechSynthesisVoice | null {
    // Re-check voices if not yet loaded
    if (!this.voicesLoaded) {
      this.loadVoices()
    }

    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'))
    if (englishVoices.length === 0) return this.voices[0] || null

    // Score each voice — prefer natural, female, premium
    const scored = englishVoices.map(v => {
      let score = 0
      const name = v.name.toLowerCase()
      // Premium natural voices
      if (name.includes('natural') || name.includes('premium')) score += 5
      // Preferred female voice names
      if (['jenny', 'aria', 'samantha', 'zira', 'ava', 'zoe', 'susan', 'karen', 'victoria', 'fiona'].some(n => name.includes(n))) score += 4
      // Female keyword
      if (name.includes('female')) score += 3
      // Google voices are generally good quality
      if (name.includes('google') && !name.includes('male')) score += 2
      // Online/enhanced voices
      if (name.includes('online') || name.includes('enhanced')) score += 1
      return { voice: v, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0].voice
  }

  /**
   * Queue a speech utterance. Handles voice loading race condition.
   */
  speak(text: string, priority: 'normal' | 'high' = 'normal') {
    if (this._muted) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    // High priority: cancel everything and speak immediately
    if (priority === 'high') {
      window.speechSynthesis.cancel()
      this.speechQueue = []
      this.isSpeaking = false
    }

    this.speechQueue.push({ text, priority })
    this.processQueue()
  }

  private processQueue() {
    if (this.isSpeaking || this.speechQueue.length === 0) return
    if (this._muted) { this.speechQueue = []; return }

    const item = this.speechQueue.shift()!
    this.isSpeaking = true

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(item.text)

    const voice = this.getBestVoice()
    if (voice) utterance.voice = voice

    utterance.rate = 1.0
    utterance.pitch = 1.05
    utterance.volume = 1.0

    utterance.onend = () => {
      this.isSpeaking = false
      // Process next in queue after a brief pause
      setTimeout(() => this.processQueue(), 100)
    }

    utterance.onerror = () => {
      this.isSpeaking = false
      this.processQueue()
    }

    window.speechSynthesis.speak(utterance)
  }

  /** Cancel all queued and active speech */
  cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    this.speechQueue = []
    this.isSpeaking = false
  }
}

export const audioService = new AudioService()
