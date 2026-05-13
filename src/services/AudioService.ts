class AudioService {
  private ctx: AudioContext | null = null

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  resume() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init()
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
    this.playTone(440, 'sine', 0.1, 0.1)
    setTimeout(() => this.playTone(880, 'sine', 0.1, 0.1), 50)
  }

  playWin() {
    const tones = [523.25, 659.25, 783.99, 1046.50] // C major chord
    tones.forEach((t, i) => {
      setTimeout(() => this.playTone(t, 'triangle', 0.5, 0.1), i * 100)
    })
  }

  playUndo() {
    this.playTone(220, 'sine', 0.2, 0.1)
  }
}

export const audioService = new AudioService()
