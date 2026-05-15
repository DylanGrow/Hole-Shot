import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import { PlayerPicker } from '../components/PlayerPicker'
import { useMatchStore } from '../state/matchStore'
import { audioService } from '../services/AudioService'

function FloatingPoint({ value, team, onComplete }: { value: number, team: 'A' | 'B', onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -100, scale: [0.5, 1.2, 1, 1] }}
      transition={{ duration: 1, times: [0, 0.2, 0.8, 1] }}
      onAnimationComplete={onComplete}
      className={`pointer-events-none absolute z-50 text-5xl font-black italic drop-shadow-lg ${
        team === 'A' ? 'text-orange-500 left-1/4' : 'text-red-500 right-1/4'
      }`}
    >
      +{value}
    </motion.div>
  )
}

export function MatchPage() {
  const { teamA, teamB, teamAName, teamBName, history, addPoints, reset, saveMatch, setTeamName } = useMatchStore()
  const [matchMode, setMatchMode] = useState<'1v1' | '2v2'>('1v1')
  const [floatingPoints, setFloatingPoints] = useState<{ id: number, value: number, team: 'A' | 'B' }[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<'A' | 'B' | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  const isSkunk = (teamA >= 11 && teamB === 0) || (teamB >= 11 && teamA === 0)
  const isGameOver = teamA >= 21 || teamB >= 21 || isSkunk
  const isTeamAWinner = teamA > teamB

  // Preload premium natural human voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        setAvailableVoices(window.speechSynthesis.getVoices())
      }
      updateVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices
      }
    }
  }, [])

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

  const speak = (text: string) => {
    if (isMuted) return
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)

      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
      
      // Prioritize friendly, warm natural female conversational voices
      const sortedVoices = [...voices].filter(v => v.lang.startsWith('en')).sort((a, b) => {
        const scoreA = (a.name.includes('Jenny') || a.name.includes('Aria') || a.name.includes('Samantha') || a.name.includes('Zira') || a.name.includes('Female') || a.name.includes('Susan') || a.name.includes('Ava') || a.name.includes('Zoe') ? 3 : 0) +
                       (a.name.includes('Natural') || a.name.includes('Online') || a.name.includes('Premium') || (a.name.includes('Google') && !a.name.includes('Male')) ? 1 : 0);
        const scoreB = (b.name.includes('Jenny') || b.name.includes('Aria') || b.name.includes('Samantha') || b.name.includes('Zira') || b.name.includes('Female') || b.name.includes('Susan') || b.name.includes('Ava') || b.name.includes('Zoe') ? 3 : 0) +
                       (b.name.includes('Natural') || b.name.includes('Online') || b.name.includes('Premium') || (b.name.includes('Google') && !b.name.includes('Male')) ? 1 : 0);
        return scoreB - scoreA;
      })

      if (sortedVoices.length > 0) {
        utterance.voice = sortedVoices[0]
      }
      
      // Slightly varied parameters for an energized, highly human delivery
      utterance.rate = 1.0
      utterance.pitch = 1.05
      utterance.volume = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const announceWinner = (winnerName: string, loserName: string, winnerScore: number, loserScore: number) => {
    const isSkunkGame = loserScore === 0 && winnerScore >= 11
    const isBlowout = winnerScore - loserScore >= 10

    const skunkPhrases = [
      `Wow, unbelievable! ${loserName} got completely blanked. Zero points! ${winnerName}, you absolutely dominated the boards today!`,
      `That is an official skunk game! ${winnerScore} to nothing. Exceptional throwing, ${winnerName}! Let's give them a hand!`,
      `Unstoppable performance by ${winnerName}! Absolutely flawless throwing to take the skunk win over ${loserName}. Great effort out there!`
    ]

    const blowoutPhrases = [
      `What a fantastic performance! ${winnerName} takes a commanding victory, ${winnerScore} to ${loserScore}. Beautiful game!`,
      `${winnerName} was on absolute fire today! Final score: ${winnerScore} to ${loserScore}. Nicely done, everyone!`,
      `That wraps it up! ${winnerName} cruises to an excellent win over ${loserName}, ${winnerScore} to ${loserScore}. Great game!`
    ]

    const closeGamePhrases = [
      `Oh my goodness, what an exciting finish! ${winnerName} edges out the victory, ${winnerScore} to ${loserScore}. Tremendous throwing from both sides!`,
      `That was incredibly close down to the final bag! ${winnerName} takes it ${winnerScore} to ${loserScore}. What a fantastic contest!`,
      `An absolute thriller! ${winnerName} claims the win ${winnerScore} to ${loserScore}. Hats off to both teams for playing a fantastic game!`
    ]

    const winPhrases = [
      `Excellent match! ${winnerName} secures the victory, ${winnerScore} to ${loserScore}. Great sportsmanship all around!`,
      `Wonderful game, everyone! ${winnerName} wins it ${winnerScore} to ${loserScore}. Let's get ready for another fantastic round!`,
      `And the win goes to ${winnerName}! Final score: ${winnerScore} to ${loserScore}. Superb performance today!`
    ]

    let phrases: string[]
    if (isSkunkGame) {
      phrases = skunkPhrases
    } else if (isBlowout) {
      phrases = blowoutPhrases
    } else if (winnerScore - loserScore <= 3) {
      phrases = closeGamePhrases
    } else {
      phrases = winPhrases
    }

    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    speak(phrase)
  }

  // Guaranteed synchronous voice execution on score/win update
  const processSpeechAfterScoreChange = (newTeamA: number, newTeamB: number, scoredTeam?: 'A' | 'B') => {
    const isSkunkNow = (newTeamA >= 11 && newTeamB === 0) || (newTeamB >= 11 && newTeamA === 0)
    const isGameOverNow = newTeamA >= 21 || newTeamB >= 21 || isSkunkNow

    if (isGameOverNow) {
      const winnerName = newTeamA > newTeamB ? teamAName : teamBName
      const loserName = newTeamA > newTeamB ? teamBName : teamAName
      const winnerScore = Math.max(newTeamA, newTeamB)
      const loserScore = Math.min(newTeamA, newTeamB)
      
      triggerHaptic([100, 50, 100])
      if (!isMuted) audioService.playWin()
      announceWinner(winnerName, loserName, winnerScore, loserScore)
    } else if (scoredTeam) {
      // Very human, warm conversational score updates
      const scoringTeamName = scoredTeam === 'A' ? teamAName : teamBName
      const phrases = [
        `Beautiful throw by ${scoringTeamName}! Score is ${newTeamA} to ${newTeamB}.`,
        `Right in the hole! ${scoringTeamName} moves up. ${newTeamA} to ${newTeamB}.`,
        `Excellent bag! It's now ${newTeamA} to ${newTeamB}.`,
        `Great shot! Score updates to ${newTeamA} to ${newTeamB}.`,
        `Score is ${newTeamA} to ${newTeamB}. Nice throwing out there!`
      ]
      speak(phrases[Math.floor(Math.random() * phrases.length)])
    }
  }

  const handleAddPoints = (team: 'A' | 'B') => {
    if (isGameOver) return
    audioService.resume()
    triggerHaptic()
    if (!isMuted) audioService.playScore()

    setFloatingPoints(prev => [...prev, { id: Date.now(), value: 3, team }])

    const newA = team === 'A' ? Math.min(21, teamA + 3) : teamA
    const newB = team === 'B' ? Math.min(21, teamB + 3) : teamB

    addPoints(team, 3)
    processSpeechAfterScoreChange(newA, newB, team)
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to start a new game?')) {
      reset()
      setShowConfetti(false)
      speak("New game started. Have a wonderful match!")
    }
  }

  const handleSwapTeams = () => {
    triggerHaptic()
    const tempName = teamAName
    setTeamName('A', teamBName)
    setTeamName('B', tempName)
    speak(`Sides swapped beautifully. ${teamBName} is now Team A.`)
  }

  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (!nextMuted) {
      setTimeout(() => {
        speak("Announcer voice is on and ready!")
      }, 50)
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return
      if (document.activeElement?.tagName === 'INPUT') return

      switch(e.key) {
        case '1': handleAddPoints('A'); break;
        case '2': handleAddPoints('B'); break;
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGameOver, teamAName, teamBName, teamA, teamB])

  const handleNameChange = (team: 'A' | 'B') => {
    setPickerOpen(team)
  }

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Momentum Chart Logic
  const getMomentumData = () => {
    if (history.length === 0) return [0]
    return [0, ...history.map(entry => entry.teamAScore - entry.teamBScore)]
  }

  const momentum = getMomentumData()

  const exportMatchAsImage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 1200, 630)
    gradient.addColorStop(0, '#18181b')
    gradient.addColorStop(1, '#09090b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1200, 630)

    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 20
    ctx.strokeRect(40, 40, 1120, 550)

    ctx.fillStyle = '#f97316'
    ctx.font = 'bold 80px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('HOLE SHOT', 600, 150)

    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#71717a'
    ctx.fillText('FINAL SCORE', 600, 220)

    ctx.font = 'bold 60px sans-serif'
    ctx.fillStyle = isTeamAWinner ? '#22c55e' : '#ffffff'
    ctx.fillText(teamAName.toUpperCase(), 350, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(teamA.toString(), 350, 500)

    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#3f3f46'
    ctx.fillText('VS', 600, 420)

    ctx.font = 'bold 60px sans-serif'
    ctx.fillStyle = !isTeamAWinner ? '#22c55e' : '#ffffff'
    ctx.fillText(teamBName.toUpperCase(), 850, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(teamB.toString(), 850, 500)

    if (isGameOver) {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 30px sans-serif'
      const winnerX = isTeamAWinner ? 350 : 850
      ctx.fillText('🏆 WINNER 🏆', winnerX, 550)
    }

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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 p-3 pb-20 md:p-6">
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

      {/* Extremely compact top control strip without extra title space */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl glass p-3 border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1">Mode:</span>
          {(['1v1', '2v2'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { triggerHaptic(); setMatchMode(mode); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                matchMode === mode ? 'bg-orange-500 text-white shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={handleToggleMute}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
              isMuted ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}
            title={isMuted ? 'Turn Announcer On' : 'Turn Announcer Off'}
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
            <span>{isMuted ? 'Announcer Off' : 'Announcer On'}</span>
          </button>
          
          <button
            onClick={() => setIsHighContrast(!isHighContrast)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
              isHighContrast ? 'bg-orange-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
            title="High Contrast Mode"
          >
            <span>☀️</span>
            <span>Contrast</span>
          </button>

          <button
            onClick={saveMatch}
            className="rounded-lg px-3 py-1.5 bg-green-600 text-white hover:bg-green-500 transition-all text-xs font-black shadow-md"
            title="Save Match Result"
          >
            💾 Save
          </button>

          <button
            onClick={handleReset}
            className="rounded-lg px-3 py-1.5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
            title="Start New Game"
          >
            🔄 New Game
          </button>
        </div>
      </section>

      {isGameOver && (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 sm:p-8 text-center shadow-2xl ring-4 ring-orange-500/20 animate-in zoom-in-95 duration-500">
          <div className="mb-2 text-5xl sm:text-6xl">🎉</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white drop-shadow-md truncate px-2">
            {isTeamAWinner ? teamAName : teamBName} WINS!
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-orange-100">
            {isSkunk ? '💥 Absolute Skunkage (11-0) 💥' : '🏆 Dominance Achieved 🏆'}
          </p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button 
              onClick={exportMatchAsImage}
              aria-label="Export win"
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 font-black text-white shadow-xl transition-transform active:scale-95 text-sm sm:text-base"
            >
              <span>📸</span> Export Result
            </button>

            <button 
              onClick={handleReset}
              aria-label="New Game"
              className="rounded-full bg-white px-6 py-3 font-black text-orange-600 shadow-xl transition-transform active:scale-95 text-sm sm:text-base"
            >
              Start New Game
            </button>
          </div>
        </div>
      )}

      {/* Match Momentum Chart */}
      {history.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl glass p-4 border-white/5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Match Momentum</span>
            <div className="flex gap-4 text-[10px] font-bold truncate max-w-[60%]">
              <span className="text-orange-500 truncate">+{teamAName}</span>
              <span className="text-red-500 truncate">+{teamBName}</span>
            </div>
          </div>
          <div className="h-12 w-full overflow-hidden px-2">
            <svg width="100%" height="100%" viewBox={`0 -25 ${Math.max(100, (momentum.length - 1) * 20)} 50`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <line x1="0" y1="0" x2={(momentum.length - 1) * 20} y2="0" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
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

      {/* Main Scoring Area */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="relative flex flex-col">
            <Scoreboard 
              label={teamAName} 
              score={teamA} 
              isWinner={teamA >= 21 || (isSkunk && isTeamAWinner)} 
            />
            {teamAOnFire && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -left-1 -top-1 z-20 text-2xl filter drop-shadow-lg"
              >
                🔥
              </motion.div>
            )}
            <button
              onClick={() => handleNameChange('A')}
              aria-label={`Edit ${teamAName}`}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 py-2.5 px-2 text-xs sm:text-sm font-bold text-orange-400 hover:bg-orange-500/25 transition-all shadow-sm"
            >
              <span>✏️</span>
              <span className="truncate">Edit Team</span>
            </button>
          </div>
          <div className="relative flex flex-col">
            <Scoreboard 
              label={teamBName} 
              score={teamB} 
              isWinner={teamB >= 21 || (isSkunk && !isTeamAWinner)} 
            />
            {teamBOnFire && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 z-20 text-2xl filter drop-shadow-lg"
              >
                🔥
              </motion.div>
            )}
            <button
              onClick={() => handleNameChange('B')}
              aria-label={`Edit ${teamBName}`}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-500/15 border border-red-500/30 py-2.5 px-2 text-xs sm:text-sm font-bold text-red-400 hover:bg-red-500/25 transition-all shadow-sm"
            >
              <span>✏️</span>
              <span className="truncate">Edit Team</span>
            </button>
          </div>
        </div>

        {/* Swap Sides button before scoring */}
        {history.length === 0 && (
          <div className="flex justify-center my-1">
             <button 
               onClick={handleSwapTeams}
               className="rounded-xl bg-white/5 border border-white/5 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all shadow-sm"
               title="Swap sides (only before scoring)"
             >
               Swap Sides 🔄
             </button>
          </div>
        )}

        {/* Exclusive Massive +3 Scoring Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleAddPoints('A')}
            disabled={isGameOver}
            aria-label={`Add 3 points to ${teamAName}`}
            className="btn-premium rounded-[32px] bg-gradient-to-b from-orange-500 to-orange-600 py-10 sm:py-12 text-center text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-orange-500/30 border border-orange-400/30 disabled:opacity-50 flex flex-col items-center justify-center gap-1.5 group select-none"
          >
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-orange-200/90 font-black block">Score Hole</span>
            <span>+3</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleAddPoints('B')}
            disabled={isGameOver}
            aria-label={`Add 3 points to ${teamBName}`}
            className="btn-premium rounded-[32px] bg-gradient-to-b from-red-600 to-red-700 py-10 sm:py-12 text-center text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-red-600/30 border border-red-500/30 disabled:opacity-50 flex flex-col items-center justify-center gap-1.5 group select-none"
          >
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-red-200/90 font-black block">Score Hole</span>
            <span>+3</span>
          </motion.button>
        </div>
      </section>

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
