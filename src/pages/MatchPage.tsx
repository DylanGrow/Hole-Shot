import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import { MatchHistory } from '../components/MatchHistory'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import { PlayerPicker } from '../components/PlayerPicker'
import { TournamentBracket } from '../components/TournamentBracket'
import { useMatchStore } from '../state/matchStore'
import { audioService } from '../services/AudioService'
import { db } from '../db/database'
import { t, type Locale } from '../i18n'

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

function FloatingPoint({ value, team, onComplete }: { value: number, team: 'A' | 'B', onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -100, scale: [0.5, 1.2, 1, 1] }}
      transition={{ duration: 1, times: [0, 0.2, 0.8, 1] }}
      onAnimationComplete={onComplete}
      className={`pointer-events-none absolute z-50 text-4xl font-black italic drop-shadow-lg ${
        team === 'A' ? 'text-orange-500 left-1/4' : 'text-red-500 right-1/4'
      }`}
    >
      +{value}
    </motion.div>
  )
}

export function MatchPage() {
  const { teamA, teamB, teamAName, teamBName, history, addPoints, adjustScore, addPointsWithCancellation, undo, reset, saveMatch, setTeamName, winTarget, setWinTarget, locale, setLocale } = useMatchStore()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [seriesRecord, setSeriesRecord] = useState({ winsA: 0, winsB: 0 })
  const [matchMode, setMatchMode] = useState<'1v1' | '2v2'>('1v1')
  const [pointValues, setPointValues] = useState({ hole: 3, board: 1 })
  const [floatingPoints, setFloatingPoints] = useState<{ id: number, value: number, team: 'A' | 'B' }[]>([])
  const [isCancellationMode, setIsCancellationMode] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  
  const [pickerOpen, setPickerOpen] = useState<'A' | 'B' | null>(null)

  const canUndo = history.length > 0
  const isSkunk = (teamA >= 11 && teamB === 0) || (teamB >= 11 && teamA === 0)
  const isGameOver = teamA >= winTarget || teamB >= winTarget || isSkunk

  // Streak detection
  const getStreak = (team: 'A' | 'B') => {
    if (history.length < 3) return false
    const lastThree = history.slice(-3)
    return lastThree.every(entry => entry.team === team)
  }

  const teamAOnFire = getStreak('A')
  const teamBOnFire = getStreak('B')

  // Simple Confetti Effect
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isGameOver) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isGameOver])

  const triggerHaptic = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

  const handleAddPoints = (team: 'A' | 'B', points: number) => {
    if (isGameOver) return
    // Resume audio context if suspended (browser autoplay policy)
    audioService.resume()
    triggerHaptic()
    audioService.playScore()
    
    // Add floating feedback
    setFloatingPoints(prev => [...prev, { id: Date.now(), value: points, team }])

    // Update state
    if (isCancellationMode) {
      addPointsWithCancellation(team, points)
    } else {
      addPoints(team, points)
    }
  }

  const handleUndo = () => {
    audioService.resume()
    triggerHaptic(30)
    audioService.playUndo()
    undo()
  }

  const handleReset = () => {
    const message = locale === 'es'
      ? '¿Estás seguro de que quieres comenzar un nuevo juego?'
      : 'Are you sure you want to start a new game?'
    if (confirm(message)) {
      reset()
      setShowConfetti(false)
    }
  }

  const handleSwapTeams = () => {
    triggerHaptic()
    const tempName = teamAName
    setTeamName('A', teamBName)
    setTeamName('B', tempName)
  }

  const handleSwapLastAction = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const otherTeam = last.team === 'A' ? 'B' : 'A'
    
    // Undo then add to other team
    handleUndo()
    setTimeout(() => {
      handleAddPoints(otherTeam, last.points)
    }, 50)
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return
      // Prevent triggering if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return

      switch(e.key) {
        case '1': handleAddPoints('A', pointValues.hole); break;
        case '2': handleAddPoints('A', pointValues.board); break;
        case '9': handleAddPoints('B', pointValues.hole); break;
        case '0': handleAddPoints('B', pointValues.board); break;
        case 'z': if(e.ctrlKey || e.metaKey) handleUndo(); break;
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGameOver, pointValues, canUndo, teamAName, teamBName])

  const handleNameChange = (team: 'A' | 'B') => {
    setPickerOpen(team)
  }

  const handleResetSeries = () => {
    const message = locale === 'es'
      ? '¿Reiniciar el registro de la serie?'
      : 'Reset the series record?'
    if (confirm(message)) {
      setSeriesRecord({ winsA: 0, winsB: 0 })
    }
  }

  // Load Series Record
  useEffect(() => {
    const loadSeries = async () => {
      const matches = await db.matches.toArray()
      let winsA = 0
      let winsB = 0
      
      matches.forEach(m => {
        const isMatchup = (m.teamAName === teamAName && m.teamBName === teamBName) ||
                          (m.teamAName === teamBName && m.teamBName === teamAName)
        
        if (isMatchup) {
          const mWinnerName = m.winner === 'A' ? m.teamAName : m.teamBName
          if (mWinnerName === teamAName) winsA++
          else if (mWinnerName === teamBName) winsB++
        }
      })
      setSeriesRecord({ winsA, winsB })
    }
    loadSeries()
  }, [teamAName, teamBName, history.length])

  const speak = (text: string) => {
    if (isMuted) return
    // Stop any ongoing speech before speaking new phrase
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const announceWinner = (winnerName: string, loserName: string, winnerScore: number, loserScore: number) => {
    const isSkunk = loserScore === 0 && winnerScore >= 11
    
    const skunkPhrases = {
      en: [
        `A SKUNK? In my backyard? ${loserName}, you're a disgrace! ${winnerScore} to ${loserScore}? Go sit in the truck!`,
        `You got skunked, ${loserName}! I've seen better form from a wet noodle. Don't even look at me.`,
        `${loserName}, you're officially a local legend for all the wrong reasons. Skunked!`
      ],
      es: [
        `¿Un SKUNK? ¿En mi patio? ¡${loserName}, eres una vergüenza! ¿${winnerScore} a ${loserScore}? ¡Vete a sentar al camión!`,
        `¡Te dieron una paliza, ${loserName}! He visto mejores formas en un fideo mojado. Ni me mires.`,
        `${loserName}, eres oficialmente una leyenda local por todas las razones equivocadas. ¡Blanqueado!`
      ]
    }

    const winPhrases = {
      en: [
        `Look at that! ${winnerName} just showed you how it's done. ${loserName}, don't quit your day job!`,
        `That's a wrap! ${winnerName} takes the glory. ${loserName}, go get me a cold one, you're done!`,
        `Another win for ${winnerName}. ${loserName}, I'd say good game, but I was taught not to lie.`
      ],
      es: [
        `¡Mira eso! ${winnerName} acaba de enseñarte cómo se hace. ¡${loserName}, no dejes tu trabajo de día!`,
        `¡Se acabó! ${winnerName} se lleva la gloria. ¡${loserName}, ve a buscarme una fría, terminaste!`,
        `Otra victoria para ${winnerName}. ${loserName}, diría que fue un buen juego, pero me enseñaron a no mentir.`
      ]
    }

    const phrases = isSkunk ? skunkPhrases[locale] : winPhrases[locale]
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    speak(phrase)
  }

  useEffect(() => {
    if (isGameOver) {
      const winnerName = teamA >= winTarget ? teamAName : teamBName
      const loserName = teamA >= winTarget ? teamBName : teamAName
      const winnerScore = Math.max(teamA, teamB)
      const loserScore = Math.min(teamA, teamB)
      
      triggerHaptic([100, 50, 100])
      audioService.playWin()
      announceWinner(winnerName, loserName, winnerScore, loserScore)
    }
  }, [isGameOver])

  // Momentum Chart Logic
  const getMomentumData = () => {
    if (history.length === 0) return [0]
    return [0, ...history.map(entry => entry.teamAScore - entry.teamBScore)]
  }

  const momentum = getMomentumData()

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const exportMatchAsImage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630)
    gradient.addColorStop(0, '#18181b')
    gradient.addColorStop(1, '#09090b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1200, 630)

    // Border
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 20
    ctx.strokeRect(40, 40, 1120, 550)

    // Title
    ctx.fillStyle = '#f97316'
    ctx.font = 'bold 80px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('HOLE SHOT CHAMPIONSHIP', 600, 150)

    // Scores
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#71717a'
    ctx.fillText('FINAL SCORE', 600, 220)

    // Team A
    ctx.font = 'bold 60px sans-serif'
    ctx.fillStyle = teamA >= 21 ? '#22c55e' : '#ffffff'
    ctx.fillText(teamAName.toUpperCase(), 350, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(teamA.toString(), 350, 500)

    // VS
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#3f3f46'
    ctx.fillText('VS', 600, 420)

    // Team B
    ctx.font = 'bold 60px sans-serif'
    ctx.fillStyle = teamB >= 21 ? '#22c55e' : '#ffffff'
    ctx.fillText(teamBName.toUpperCase(), 850, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(teamB.toString(), 850, 500)

    // Winner Badge
    if (isGameOver) {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 30px sans-serif'
      const winnerX = teamA >= winTarget ? 350 : 850
      ctx.fillText('🏆 WINNER 🏆', winnerX, 550)
    }

    // Date
    ctx.fillStyle = '#52525b'
    ctx.font = '20px monospace'
    ctx.fillText(new Date().toLocaleString(), 600, 580)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `hole-shot-${teamAName}-vs-${teamBName}.png`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }, 'image/png')
  }

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const stop = () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null // Prevent restart loop
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }

    if (isListening) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = locale === 'en' ? 'en-US' : 'es-ES'

      recognition.onresult = (event: any) => {
        const current = event.resultIndex
        const result = event.results[current]
        const text = result[0].transcript.toLowerCase()
        setTranscript(text)

        if (result.isFinal) {
          processVoiceCommand(text)
          setTimeout(() => setTranscript(''), 1000)
        }
      }

      recognition.onend = () => {
        // Only restart if we are still supposed to be listening
        if (isListening) {
          // Add a small delay before restarting to prevent rapid-fire crashes
          setTimeout(() => {
            try {
              if (isListening) recognition.start()
            } catch (e) {
              console.error('Failed to restart recognition:', e)
            }
          }, 250)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setIsListening(false)
          const message = locale === 'es'
            ? 'Acceso al micrófono denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.'
            : 'Microphone access denied. Please allow microphone access in your browser settings.'
          alert(message)
        } else if (event.error === 'no-speech') {
          // Silently handle no-speech errors (common and not critical)
          console.log('No speech detected')
        } else if (event.error === 'network') {
          setIsListening(false)
          const message = locale === 'es'
            ? 'Error de red. Verifica tu conexión a internet.'
            : 'Network error. Please check your internet connection.'
          alert(message)
        }
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch (e) {
        console.error('Initial recognition start failed:', e)
      }
    } else {
      stop()
    }

    return () => stop()
  }, [isListening, teamAName, teamBName, pointValues])

  const processVoiceCommand = (text: string) => {
    if (isGameOver) return
    const clean = text.trim().toLowerCase()
    
    // Voice stop commands (universal/English/Spanish)
    if (['stop', 'shut up', 'quiet', 'para', 'silencio', 'cállate'].some(cmd => clean.includes(cmd))) {
      window.speechSynthesis.cancel()
      return
    }
    
    // Check for Undo
    if (['undo', 'go back', 'wrong', 'deshacer', 'atrás', 'error', 'mal'].some(cmd => clean.includes(cmd))) {
      handleUndo()
      return
    }

    // Check for Reset
    if (['reset', 'new game', 'start over', 'reiniciar', 'nuevo juego', 'empezar'].some(cmd => clean.includes(cmd))) {
      handleReset()
      return
    }

    // Determine Team using Regex (word boundaries to avoid partial matches)
    let team: 'A' | 'B' | null = null
    const nameA = teamAName.toLowerCase()
    const nameB = teamBName.toLowerCase()

    const regexA = new RegExp(`\\b(${nameA}|team a|alpha|equipo a|primero)\\b`, 'i')
    const regexB = new RegExp(`\\b(${nameB}|team b|bravo|equipo b|segundo)\\b`, 'i')

    if (regexA.test(clean)) {
      team = 'A'
    } else if (regexB.test(clean)) {
      team = 'B'
    }

    // Determine Points
    let points: number | null = null
    const holeKeywords = ['hole', 'three', ' 3', 'hoyo', 'tres']
    const boardKeywords = ['board', 'one', ' 1', 'tablero', 'madera', 'uno']

    if (holeKeywords.some(kw => clean.includes(kw))) {
      points = pointValues.hole
    } else if (boardKeywords.some(kw => clean.includes(kw))) {
      points = pointValues.board
    }

    if (team && points !== null) {
      handleAddPoints(team, points)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 pb-20 md:p-8">
      <div className="noise" />
      
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ top: -20, left: `${Math.random() * 100}%`, rotate: 0 }}
              animate={{ 
                top: '120%', 
                rotate: 360,
                left: `${(Math.random() * 20) - 10 + (i * 2)}%`
              }}
              transition={{ 
                duration: Math.random() * 3 + 2, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 2
              }}
              className="absolute h-3 w-3 rounded-sm"
              style={{ backgroundColor: ['#f97316', '#ef4444', '#fbbf24', '#22c55e'][i % 4] }}
            />
          ))}
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20">
            <span className="text-3xl">🕳️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                Hole <span className="text-orange-500">Shot</span>
              </h1>
              <div className="rounded-full bg-zinc-800/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-white/5">
                Series: {seriesRecord.winsA} - {seriesRecord.winsB}
              </div>
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              {t(locale, 'subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="rounded-xl bg-white/5 p-3 text-zinc-400 transition-all hover:bg-white/10"
            title={t(locale, locale === 'en' ? 'language' : 'english')}
            aria-label={t(locale, locale === 'en' ? 'language' : 'english')}
          >
            {locale === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { audioService.resume(); setIsListening(!isListening); }}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold transition-all ${
              isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'glass text-zinc-300'
            }`}
          >
            <span className={isListening ? 'animate-pulse' : ''}>{isListening ? '🛑' : '🎙️'}</span>
            {isListening ? 'Stop Listening' : 'Voice Input'}
          </motion.button>

          <div className="flex items-center gap-2 rounded-2xl glass p-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo last point"
              className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-30"
            >
              Undo
            </motion.button>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              aria-label="Reset match scores"
              className="rounded-xl px-4 py-2 text-sm font-bold"
            >
              Reset
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={saveMatch}
            aria-label={t(locale, 'saveMatch')}
            className="rounded-2xl bg-green-600 px-6 py-3 font-black text-white shadow-lg shadow-green-600/20"
          >
            {t(locale, 'saveMatch')}
          </motion.button>
        </div>
      </header>

      {isListening && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl glass p-6 text-center border-orange-500/30"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="relative h-3 w-3">
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-500 opacity-75"></div>
              <div className="relative h-3 w-3 rounded-full bg-orange-500"></div>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-orange-400">
              {locale === 'es' ? 'El Tío está escuchando...' : 'Uncle is Listening...'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[`"${teamAName} three"`, `"${teamBName} one"`, '"Undo"'].map((tip, i) => (
              <div key={i} className="rounded-xl bg-white/5 py-2 px-3 text-[10px] font-medium text-zinc-400">
                {tip}
              </div>
            ))}
          </div>

          {transcript && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-6 inline-block rounded-2xl bg-orange-500 px-6 py-3 text-lg font-black italic shadow-xl shadow-orange-500/20"
            >
              "{transcript}"
            </motion.div>
          )}
        </motion.div>
      )}

      {isGameOver && (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center shadow-2xl ring-4 ring-orange-500/20 animate-in zoom-in-95 duration-500">
          <div className="mb-2 text-6xl">🎉</div>
          <h2 className="text-5xl font-black text-white drop-shadow-md">
            {teamA >= winTarget ? teamAName : teamBName} {locale === 'es' ? 'GANA!' : 'WINS!'}
          </h2>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.3em] text-orange-100/80">
            {isSkunk 
              ? (locale === 'es' ? 'Blanqueada Absoluta (11-0)' : 'Absolute Skunkage (11-0)') 
              : (locale === 'es' ? 'Dominio Alcanzado' : 'Dominance Achieved')}
          </p>
          
        <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              onClick={exportMatchAsImage}
              aria-label={locale === 'es' ? 'Exportar victoria' : 'Export win'}
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3 font-bold text-white shadow-xl transition-transform active:scale-95"
            >
              <span>📸</span> {locale === 'es' ? 'Exportar' : 'Export'}
            </button>

            <button 
              onClick={handleReset}
              aria-label={locale === 'es' ? 'Nuevo Juego' : 'New Game'}
              className="rounded-full bg-white px-8 py-3 font-bold text-orange-600 shadow-xl transition-transform active:scale-95"
            >
              {locale === 'es' ? 'Nuevo Juego' : 'New Game'}
            </button>
          </div>
        </div>
      )}

      {/* Match Momentum Chart */}
      {history.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl glass p-4 border-white/5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{t(locale, 'matchMomentum')}</span>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="text-orange-500">+{teamAName}</span>
              <span className="text-red-500">+{teamBName}</span>
            </div>
          </div>
          <div className="h-20 w-full overflow-hidden px-2">
            <svg width="100%" height="100%" viewBox={`0 -25 ${Math.max(100, (momentum.length - 1) * 20)} 50`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* Zero Line */}
              <line x1="0" y1="0" x2={(momentum.length - 1) * 20} y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
              {/* Momentum Line */}
              <motion.polyline
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                fill="none"
                stroke="url(#momentumGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={momentum.map((val, i) => `${i * 20},${-val}`).join(' ')}
              />
              {/* Current Point Indicator */}
              <circle 
                cx={(momentum.length - 1) * 20} 
                cy={-momentum[momentum.length - 1]} 
                r="4" 
                fill={momentum[momentum.length - 1] > 0 ? '#f97316' : momentum[momentum.length - 1] < 0 ? '#ef4444' : '#ffffff'} 
              />
            </svg>
          </div>
        </motion.div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {locale === 'es' ? 'Ajustes de Partida' : 'Match Settings'}
            </span>
            <div className="flex gap-2 rounded-xl glass p-1 self-start">
              {(['1v1', '2v2'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { triggerHaptic(); setMatchMode(mode); }}
                  className={`rounded-lg px-4 py-1 text-xs font-bold transition-all ${
                    matchMode === mode ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t(locale, 'seriesOptions')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`rounded-xl p-3 transition-all ${isMuted ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-zinc-400'}`}
                title={isMuted ? t(locale, 'unmute') : t(locale, 'mute')}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => setIsHighContrast(!isHighContrast)}
                className={`rounded-xl p-3 transition-all ${isHighContrast ? 'bg-orange-500 text-white' : 'bg-white/5 text-zinc-400'}`}
                title={t(locale, 'sunlight')}
              >
                ☀️
              </button>
              <button
                onClick={() => setIsCancellationMode(!isCancellationMode)}
                className={`rounded-xl p-3 transition-all ${isCancellationMode ? 'bg-purple-500/10 text-purple-500' : 'bg-white/5 text-zinc-400'}`}
                title={t(locale, 'cancellation')}
              >
                {isCancellationMode ? '⚖️ ON' : '⚖️ OFF'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t(locale, 'seriesScore')}</span>
            <div className="flex items-center gap-6 rounded-2xl glass px-4 py-2">
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < seriesRecord.winsA ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-zinc-800'}`} />
                ))}
              </div>
              <div className="text-xs font-black text-white px-2 border-x border-white/10">VS</div>
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-2.5 w-2.5 rounded-full ${i < seriesRecord.winsB ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-zinc-800'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t(locale, 'target')}</span>
            <div className="flex gap-2 rounded-xl glass p-1">
              {[11, 15, 21].map(target => (
                <button
                  key={target}
                  onClick={() => { triggerHaptic(); setWinTarget(target); }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    winTarget === target ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {target} pts
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleNameChange('A')} 
            aria-label={`Change name for ${teamAName}`}
            className="cursor-pointer group relative text-left"
          >
            <Scoreboard 
              label={teamAName} 
              score={teamA} 
              isWinner={teamA >= winTarget} 
              onAdjust={(amt) => { audioService.resume(); triggerHaptic(20); adjustScore('A', amt); }}
            />
            {teamAOnFire && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -left-2 -top-2 z-20 text-3xl filter drop-shadow-lg"
              >
                🔥
              </motion.div>
            )}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase">Edit</span>
            </div>
          </button>
          <button 
            onClick={() => handleNameChange('B')} 
            aria-label={`Change name for ${teamBName}`}
            className="cursor-pointer group relative text-left"
          >
            <Scoreboard 
              label={teamBName} 
              score={teamB} 
              isWinner={teamB >= winTarget} 
              onAdjust={(amt) => { audioService.resume(); triggerHaptic(20); adjustScore('B', amt); }}
            />
            {teamBOnFire && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -right-2 -top-2 z-20 text-3xl filter drop-shadow-lg"
              >
                🔥
              </motion.div>
            )}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 uppercase">Edit</span>
            </div>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Point Values</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Hole</span>
              <input 
                type="number" 
                aria-label="Hole Point Value"
                title="Points for scoring in the hole"
                value={pointValues.hole} 
                disabled={isGameOver}
                onChange={(e) => setPointValues({...pointValues, hole: Math.max(0, parseInt(e.target.value) || 0)})}
                className="w-12 rounded-lg bg-zinc-900 border border-white/5 px-2 py-1 text-xs font-bold text-orange-400 disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Board</span>
              <input 
                type="number" 
                aria-label="Board Point Value"
                title="Points for scoring on the board"
                value={pointValues.board} 
                disabled={isGameOver}
                onChange={(e) => setPointValues({...pointValues, board: Math.max(0, parseInt(e.target.value) || 0)})}
                className="w-12 rounded-lg bg-zinc-900 border border-white/5 px-2 py-1 text-xs font-bold text-orange-400 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-center my-2 gap-4">
           <button 
             onClick={handleSwapTeams}
             disabled={history.length > 0}
             className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors disabled:opacity-20 flex items-center gap-2"
             title="Swap sides (only before scoring)"
           >
             <span>Swap Sides 🔄</span>
           </button>
           
           {history.length > 0 && (
             <motion.button
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               onClick={handleSwapLastAction}
               className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-2"
               title="Move last point to the other team"
             >
               <span>Swap Last Point ⇄</span>
             </motion.button>
           )}
        </div>

        {history.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Last Action:</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${history[history.length-1].team === 'A' ? 'bg-orange-500' : 'bg-red-500'}`} />
                <span className="text-sm font-bold text-white">
                  {history[history.length-1].team === 'A' ? teamAName : teamBName} +{history[history.length-1].points}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSwapLastAction} className="rounded-lg bg-white/5 px-3 py-1 text-[10px] font-bold hover:bg-white/10 transition-colors">Swap Team</button>
              <button onClick={handleUndo} className="rounded-lg bg-orange-500/20 px-3 py-1 text-[10px] font-bold text-orange-400 hover:bg-orange-500/30 transition-colors">Undo</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddPoints('A', pointValues.hole)}
              disabled={isGameOver}
              aria-label={`Add ${pointValues.hole} points to ${teamAName}`}
              className="btn-premium rounded-3xl bg-orange-500 p-6 text-xl font-black shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {teamAName} +{pointValues.hole}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddPoints('A', pointValues.board)}
              disabled={isGameOver}
              aria-label={`Add ${pointValues.board} point to ${teamAName}`}
              className="btn-premium rounded-2xl bg-orange-600 p-4 text-lg font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50"
            >
              {teamAName} +{pointValues.board}
            </motion.button>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddPoints('B', pointValues.hole)}
              disabled={isGameOver}
              aria-label={`Add ${pointValues.hole} points to ${teamBName}`}
              className="btn-premium rounded-3xl bg-red-600 p-6 text-xl font-black shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {teamBName} +{pointValues.hole}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddPoints('B', pointValues.board)}
              disabled={isGameOver}
              aria-label={`Add ${pointValues.board} point to ${teamBName}`}
              className="btn-premium rounded-2xl bg-red-700 p-4 text-lg font-bold shadow-lg shadow-red-700/20 disabled:opacity-50"
            >
              {teamBName} +{pointValues.board}
            </motion.button>
          </div>
        </div>
      </section>

      <MatchHistory locale={locale} />
      <PlayerLeaderboard locale={locale} />
      <TournamentBracket locale={locale} />

        <PlayerPicker
          isOpen={!!pickerOpen}
          onClose={() => setPickerOpen(null)}
          is2v2={matchMode === '2v2'}
          teamAName={teamAName}
          teamBName={teamBName}
          onSelect={(team, names) => setTeamName(team, names)}
        />

        {floatingPoints.map(fp => (
          <FloatingPoint 
            key={fp.id} 
            value={fp.value} 
            team={fp.team} 
            onComplete={() => setFloatingPoints(prev => prev.filter(p => p.id !== fp.id))} 
          />
        ))}
      </main>
    )
  }
