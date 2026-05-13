import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import { MatchHistory } from '../components/MatchHistory'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import { PlayerPicker } from '../components/PlayerPicker'
import { useMatchStore } from '../state/matchStore'
import { audioService } from '../services/AudioService'
import { db } from '../db/database'

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function MatchPage() {
  const { teamA, teamB, teamAName, teamBName, history, addPoints, undo, reset, saveMatch, setTeamName } = useMatchStore()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [winTarget, setWinTarget] = useState(21)
  const [seriesRecord, setSeriesRecord] = useState({ winsA: 0, winsB: 0 })
  const [matchMode, setMatchMode] = useState<'1v1' | '2v2'>('1v1')
  const [pointValues, setPointValues] = useState({ hole: 3, board: 1 })
  
  const [pickerOpen, setPickerOpen] = useState<'A' | 'B' | null>(null)

  const canUndo = history.length > 0
  const isGameOver = teamA >= winTarget || teamB >= winTarget

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
    // Resume audio context if suspended (browser autoplay policy)
    audioService.resume()
    triggerHaptic()
    audioService.playScore()
    addPoints(team, points)
  }

  const handleUndo = () => {
    audioService.resume()
    triggerHaptic(30)
    audioService.playUndo()
    undo()
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to start a new game?')) {
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
  }, [teamAName, teamBName, history.length === 0]) // Reload when names change or match resets/saves

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const announceWinner = (winnerName: string, loserName: string, winnerScore: number, loserScore: number) => {
    const isSkunk = loserScore <= 7
    
    const skunkPhrases = [
      `A SKUNK? In my backyard? ${loserName}, you're a disgrace! ${winnerScore} to ${loserScore}? Go sit in the truck!`,
      `You got skunked, ${loserName}! I've seen better form from a wet noodle. Don't even look at me.`,
      `${loserName}, you're officially a local legend for all the wrong reasons. Skunked!`
    ]

    const winPhrases = [
      `Look at that! ${winnerName} just showed you how it's done. ${loserName}, don't quit your day job!`,
      `That's a wrap! ${winnerName} takes the glory. ${loserName}, go get me a cold one, you're done!`,
      `Another win for ${winnerName}. ${loserName}, I'd say good game, but I was taught not to lie.`
    ]

    const phrases = isSkunk ? skunkPhrases : winPhrases
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
      ctx.fillText('WINNER 🏆', winnerX, 550)
    }

    // Date
    ctx.fillStyle = '#52525b'
    ctx.font = '20px monospace'
    ctx.fillText(new Date().toLocaleString(), 600, 580)

    const link = document.createElement('a')
    link.download = `hole-shot-${teamAName}-vs-${teamBName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.')
      return
    }

    let recognition: any = null

    const startRecognition = () => {
      try {
        recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          const current = event.resultIndex
          const result = event.results[current]
          const text = result[0].transcript.toLowerCase()
          setTranscript(text)

          if (result.isFinal) {
            processVoiceCommand(text)
            // Clear transcript after short delay to show it was processed
            setTimeout(() => setTranscript(''), 1000)
          }
        }

        recognition.onend = () => {
          if (isListening) {
            // Add a small delay to avoid rapid restart loops
            setTimeout(() => {
              if (isListening) startRecognition()
            }, 300)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'not-allowed') {
            setIsListening(false)
            alert('Microphone access denied. Please enable it to use voice input.')
          }
        }

        recognition.start()
      } catch (err) {
        console.error('Failed to start recognition:', err)
      }
    }

    if (isListening) {
      startRecognition()
    } else {
      if (recognition) {
        recognition.stop()
      }
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [isListening, teamAName, teamBName, pointValues])

  const processVoiceCommand = (text: string) => {
    const cleanText = text.toLowerCase().trim()
    
    // Check for Undo
    if (cleanText.includes('undo') || cleanText.includes('go back') || cleanText.includes('wrong')) {
      handleUndo()
      return
    }

    // Determine Team
    let team: 'A' | 'B' | null = null
    const nameA = teamAName.toLowerCase()
    const nameB = teamBName.toLowerCase()

    if (cleanText.includes(nameA) || cleanText.includes('team a') || cleanText.includes(' alpha')) {
      team = 'A'
    } else if (cleanText.includes(nameB) || cleanText.includes('team b') || cleanText.includes(' bravo')) {
      team = 'B'
    }

    // Determine Points
    let points: number | null = null
    if (cleanText.includes('hole') || cleanText.includes('three') || cleanText.includes(' 3')) {
      points = pointValues.hole
    } else if (cleanText.includes('board') || cleanText.includes('one') || cleanText.includes(' 1')) {
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
              Backyard Glory
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
            aria-label="Save current match to history"
            className="rounded-2xl bg-green-600 px-6 py-3 font-black text-white shadow-lg shadow-green-600/20"
          >
            Save Match
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
            <span className="text-sm font-bold uppercase tracking-widest text-orange-400">Uncle is Listening...</span>
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
            {teamA >= winTarget ? teamAName : teamBName} WINS!
          </h2>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.3em] text-orange-100/80">
            {Math.min(teamA, teamB) <= (winTarget / 3) ? 'Absolute Skunkage' : 'Dominance Achieved'}
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <button 
              onClick={exportMatchAsImage}
              aria-label="Export match results as image"
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3 font-bold text-white shadow-xl transition-transform active:scale-95"
            >
              <span>📸</span> Export Win
            </button>

            <button 
              onClick={handleReset}
              aria-label="Start a new game"
              className="rounded-full bg-white px-8 py-3 font-bold text-orange-600 shadow-xl transition-transform active:scale-95"
            >
              New Game
            </button>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Match Settings</span>
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

          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target</span>
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
            <Scoreboard label={teamAName} score={teamA} isWinner={teamA >= winTarget} />
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
            <Scoreboard label={teamBName} score={teamB} isWinner={teamB >= winTarget} />
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
        
        <div className="flex justify-center my-2">
           <button 
             onClick={handleSwapTeams}
             disabled={history.length > 0}
             className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors disabled:opacity-20 flex items-center gap-2"
             title="Swap sides (only before scoring)"
           >
             <span>Swap Sides 🔄</span>
           </button>
        </div>

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

      <MatchHistory />
      <PlayerLeaderboard />

      <PlayerPicker
        isOpen={!!pickerOpen}
        onClose={() => setPickerOpen(null)}
        is2v2={matchMode === '2v2'}
        currentName={pickerOpen === 'A' ? teamAName : teamBName}
        onSelect={(names) => setTeamName(pickerOpen!, names)}
      />
    </main>
  )
}
