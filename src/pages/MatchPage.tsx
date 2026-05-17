import { useState, useEffect, useCallback, useMemo } from 'react'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import { PlayerPicker } from '../components/PlayerPicker'
import { useMatchStore } from '../state/matchStore'
import { audioService } from '../services/AudioService'
import { db } from '../db/database'

function FloatingPoint({ value, team, onComplete }: { value: number; team: 'A' | 'B'; onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 1000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="pointer-events-none absolute z-50 text-5xl font-black italic animate-float-up"
      style={{
        color: team === 'A' ? 'var(--color-team-a)' : 'var(--color-team-b)',
        left: team === 'A' ? '25%' : undefined,
        right: team === 'B' ? '25%' : undefined,
        top: '30%',
      }}
    >
      {value > 0 ? `+${value}` : `${value}`}
    </div>
  )
}

function ConfettiEffect() {
  const pieces = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: ['#f97316', '#3b82f6', '#fbbf24', '#22c55e', '#ef4444'][i % 5],
      delay: `${Math.random() * 2}s`,
      duration: `${Math.random() * 2 + 2}s`,
      size: Math.random() * 6 + 6,
    })), [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  )
}

interface MatchRecord {
  id?: number
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  winner: string
  completedAt: Date
}

export function MatchPage() {
  const { teamA, teamB, teamAName, teamBName, history, addPoints, undo, reset, saveMatch, setTeamName, adjustScore } = useMatchStore()
  const [matchMode, setMatchMode] = useState<'1v1' | '2v2'>('1v1')
  const [floatingPoints, setFloatingPoints] = useState<{ id: number; value: number; team: 'A' | 'B' }[]>([])
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('hs-muted') === 'true')
  const [pickerOpen, setPickerOpen] = useState<'A' | 'B' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([])
  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  const isSkunk = (teamA >= 11 && teamB === 0) || (teamB >= 11 && teamA === 0)
  const isGameOver = teamA >= 21 || teamB >= 21 || isSkunk
  const isTeamAWinner = teamA > teamB
  const roundNumber = history.length

  // Sync mute state
  useEffect(() => {
    audioService.muted = isMuted
    localStorage.setItem('hs-muted', String(isMuted))
  }, [isMuted])

  // Streak detection
  const getStreak = (team: 'A' | 'B') => {
    if (history.length < 3) return false
    return history.slice(-3).every(entry => entry.team === team)
  }

  const teamAOnFire = getStreak('A')
  const teamBOnFire = getStreak('B')

  // Game over effects
  useEffect(() => {
    if (isGameOver) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(t)
    }
  }, [isGameOver])

  const triggerHaptic = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) navigator.vibrate(pattern)
  }

  const announce = useCallback((text: string) => {
    setLiveAnnouncement(text)
  }, [])

  const announceWinner = useCallback((winnerName: string, loserName: string, winnerScore: number, loserScore: number) => {
    const isSkunkGame = loserScore === 0 && winnerScore >= 11
    const isBlowout = winnerScore - loserScore >= 10

    const phrases = isSkunkGame
      ? [`Skunk game! ${winnerName} wins ${winnerScore} to nothing!`, `${winnerName} dominates with a perfect shutout, ${winnerScore}-0!`]
      : isBlowout
      ? [`${winnerName} cruises to victory, ${winnerScore} to ${loserScore}!`, `Commanding win by ${winnerName}, ${winnerScore}-${loserScore}!`]
      : winnerScore - loserScore <= 3
      ? [`What a thriller! ${winnerName} edges it out ${winnerScore} to ${loserScore}!`, `Incredible finish! ${winnerName} wins ${winnerScore}-${loserScore}!`]
      : [`${winnerName} wins it ${winnerScore} to ${loserScore}! Great game!`, `Victory for ${winnerName}! Final: ${winnerScore}-${loserScore}.`]

    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    announce(phrase)
    audioService.speak(phrase, 'high')
  }, [announce])

  const processSpeech = useCallback((newA: number, newB: number, scoredTeam?: 'A' | 'B') => {
    const skunkNow = (newA >= 11 && newB === 0) || (newB >= 11 && newA === 0)
    const gameOverNow = newA >= 21 || newB >= 21 || skunkNow

    if (gameOverNow) {
      const winnerName = newA > newB ? teamAName : teamBName
      const loserName = newA > newB ? teamBName : teamAName
      triggerHaptic([100, 50, 100])
      audioService.playWin()
      announceWinner(winnerName, loserName, Math.max(newA, newB), Math.min(newA, newB))
    } else if (scoredTeam) {
      const phrases = [
        `Score is ${newA} to ${newB}.`,
        `${newA} to ${newB}. Nice throw!`,
        `It's now ${newA}-${newB}.`,
      ]
      const p = phrases[Math.floor(Math.random() * phrases.length)]
      announce(p)
      audioService.speak(p)
    }
  }, [teamAName, teamBName, announceWinner, announce])

  const handleChangePoints = useCallback((team: 'A' | 'B', delta: number) => {
    if (isGameOver) return
    audioService.resume()
    triggerHaptic()
    if (delta > 0) audioService.playScore()

    const currentScore = team === 'A' ? teamA : teamB
    if (currentScore + delta < 0) return
    const clamped = Math.min(21, currentScore + delta)

    setFloatingPoints(prev => [...prev, { id: Date.now() + Math.random(), value: delta, team }])
    adjustScore(team, delta)

    const newA = team === 'A' ? clamped : teamA
    const newB = team === 'B' ? clamped : teamB
    processSpeech(newA, newB, delta > 0 ? team : undefined)
  }, [isGameOver, teamA, teamB, adjustScore, processSpeech])

  const handleUndo = () => {
    if (history.length === 0) return
    audioService.playUndo()
    triggerHaptic()
    undo()
    announce('Last action undone.')
  }

  const handleReset = () => {
    if (!confirm('Start a new game?')) return
    reset()
    setShowConfetti(false)
    audioService.speak('New game! Let\'s go!')
    announce('New game started.')
  }

  const handleSwapTeams = () => {
    triggerHaptic()
    const tempName = teamAName
    setTeamName('A', teamBName)
    setTeamName('B', tempName)
    announce('Sides swapped.')
    audioService.speak('Sides swapped.')
  }

  const handleToggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    if (!next) {
      setTimeout(() => audioService.speak('Announcer on!'), 100)
    }
  }

  const handleShare = async () => {
    const text = `${isTeamAWinner ? teamAName : teamBName} wins! ${teamA}-${teamB} ${isSkunk ? '(SKUNK!)' : ''} 🎯 #HoleShot`
    if (navigator.share) {
      try { await navigator.share({ title: 'Hole Shot Result', text }) } catch {}
    } else {
      await navigator.clipboard?.writeText(text)
      announce('Result copied to clipboard!')
    }
  }

  const handleSaveAndNew = async () => {
    await saveMatch()
    setShowConfetti(false)
    announce('Match saved. New game started.')
    audioService.speak('Match saved!')
  }

  const loadHistory = async () => {
    const matches = await db.matches.orderBy('completedAt').reverse().limit(20).toArray()
    setMatchHistory(matches)
    setShowHistory(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isGameOver || document.activeElement?.tagName === 'INPUT') return
      switch (e.key) {
        case '1': handleChangePoints('A', 3); break
        case '2': handleChangePoints('B', 3); break
        case 'q': handleChangePoints('A', 1); break
        case 'w': handleChangePoints('B', 1); break
        case 'z': handleUndo(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // Cleanup speech
  useEffect(() => {
    return () => audioService.cancelSpeech()
  }, [])

  // Momentum chart data
  const momentum = useMemo(() => {
    if (history.length === 0) return [0]
    return [0, ...history.map(e => e.teamAScore - e.teamBScore)]
  }, [history])

  return (
    <>
      {/* ARIA live region for screen readers */}
      <div className="aria-live-region" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <header className="text-center py-3">
        <h1 className="text-lg font-black uppercase tracking-widest" style={{ color: 'var(--color-team-a)' }}>
          Hole Shot
        </h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cornhole Scoring</p>
      </header>

      <main id="main-content" role="main" className="mx-auto flex max-w-lg flex-col gap-4 p-3 pb-20">

        {/* Control Bar */}
        <nav className="card p-3 flex flex-wrap items-center justify-between gap-2" aria-label="Game controls">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Mode</span>
            {(['1v1', '2v2'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { triggerHaptic(); setMatchMode(mode) }}
                className="btn text-xs px-3 py-1.5"
                style={{
                  background: matchMode === mode ? 'var(--color-team-a)' : 'var(--color-surface-2)',
                  color: matchMode === mode ? '#fff' : 'var(--color-text-dim)',
                  border: matchMode === mode ? 'none' : '1px solid var(--color-border)',
                }}
                aria-pressed={matchMode === mode}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleToggleMute} className="btn btn-ghost text-xs px-3 py-1.5 gap-1" aria-pressed={!isMuted} aria-label={isMuted ? 'Turn announcer on' : 'Turn announcer off'}>
              <span aria-hidden="true">{isMuted ? '🔇' : '🔊'}</span>
              <span className="hidden sm:inline">{isMuted ? 'Off' : 'On'}</span>
            </button>
            <button onClick={loadHistory} className="btn btn-ghost text-xs px-3 py-1.5" aria-label="View match history">
              📊
            </button>
            <button onClick={handleReset} className="btn btn-ghost text-xs px-3 py-1.5" aria-label="New game">
              🔄
            </button>
          </div>
        </nav>

        {/* Round Counter */}
        {roundNumber > 0 && (
          <div className="text-center text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
            Round {roundNumber} • {teamA + teamB} total points
          </div>
        )}

        {/* Win Banner */}
        {isGameOver && (
          <section className="card-elevated p-6 text-center animate-zoom-in" style={{ border: '2px solid var(--color-green)' }}>
            <div className="mb-2 text-5xl" aria-hidden="true">🎉</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white truncate px-2">
              {isTeamAWinner ? teamAName : teamBName} Wins!
            </h2>
            <p className="mt-1 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-dim)' }}>
              {isSkunk ? '💥 Skunk (11-0) 💥' : `${teamA} - ${teamB}`}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button onClick={handleShare} className="btn text-sm px-5 py-3" style={{ background: 'var(--color-surface-3)', color: '#fff' }} aria-label="Share result">
                📤 Share
              </button>
              <button onClick={handleSaveAndNew} className="btn text-sm px-5 py-3 font-black" style={{ background: 'var(--color-green)', color: '#fff' }} aria-label="Save and start new game">
                💾 Save & New Game
              </button>
            </div>
          </section>
        )}

        {/* Momentum Chart */}
        {history.length > 1 && (
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Momentum</span>
              <div className="flex gap-3 text-[10px] font-bold">
                <span style={{ color: 'var(--color-team-a)' }}>{teamAName}</span>
                <span style={{ color: 'var(--color-team-b)' }}>{teamBName}</span>
              </div>
            </div>
            <div className="h-10 w-full overflow-hidden">
              <svg width="100%" height="100%" viewBox={`0 -25 ${Math.max(100, (momentum.length - 1) * 20)} 50`} preserveAspectRatio="none" role="img" aria-label="Match momentum chart">
                <line x1="0" y1="0" x2={(momentum.length - 1) * 20} y2="0" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <polyline
                  fill="none"
                  stroke={momentum[momentum.length - 1] >= 0 ? 'var(--color-team-a)' : 'var(--color-team-b)'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={momentum.map((val, i) => `${i * 20},${-val * 2}`).join(' ')}
                />
                <circle
                  cx={(momentum.length - 1) * 20}
                  cy={-momentum[momentum.length - 1] * 2}
                  r="4"
                  fill={momentum[momentum.length - 1] > 0 ? 'var(--color-team-a)' : momentum[momentum.length - 1] < 0 ? 'var(--color-team-b)' : '#fff'}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Scoreboards */}
        <section className="flex flex-col gap-3" aria-label="Scores">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative flex flex-col">
              <Scoreboard label={teamAName} score={teamA} isWinner={teamA >= 21 || (isSkunk && isTeamAWinner)} team="A" onFire={teamAOnFire} />
              <div className="mt-2 flex items-center gap-1">
                <button onClick={() => handleChangePoints('A', -1)} disabled={isGameOver || teamA <= 0} className="btn btn-ghost flex-1 text-xs py-1" aria-label={`Subtract 1 from ${teamAName}`}>−1</button>
                <button onClick={() => handleChangePoints('A', 1)} disabled={isGameOver} className="btn btn-ghost flex-1 text-xs py-1" aria-label={`Add 1 to ${teamAName}`}>+1</button>
              </div>
              <button onClick={() => setPickerOpen('A')} className="mt-1.5 w-full btn text-xs py-2" style={{ background: 'var(--color-team-a-bg)', color: 'var(--color-team-a)', border: '1px solid var(--color-team-a-border)' }} aria-label={`Edit ${teamAName}`}>
                ✏️ Edit
              </button>
            </div>

            <div className="relative flex flex-col">
              <Scoreboard label={teamBName} score={teamB} isWinner={teamB >= 21 || (isSkunk && !isTeamAWinner)} team="B" onFire={teamBOnFire} />
              <div className="mt-2 flex items-center gap-1">
                <button onClick={() => handleChangePoints('B', -1)} disabled={isGameOver || teamB <= 0} className="btn btn-ghost flex-1 text-xs py-1" aria-label={`Subtract 1 from ${teamBName}`}>−1</button>
                <button onClick={() => handleChangePoints('B', 1)} disabled={isGameOver} className="btn btn-ghost flex-1 text-xs py-1" aria-label={`Add 1 to ${teamBName}`}>+1</button>
              </div>
              <button onClick={() => setPickerOpen('B')} className="mt-1.5 w-full btn text-xs py-2" style={{ background: 'var(--color-team-b-bg)', color: 'var(--color-team-b)', border: '1px solid var(--color-team-b-border)' }} aria-label={`Edit ${teamBName}`}>
                ✏️ Edit
              </button>
            </div>
          </div>

          {/* Swap + Undo */}
          <div className="flex justify-center gap-2">
            {history.length === 0 && (
              <button onClick={handleSwapTeams} className="btn btn-ghost text-xs px-4 py-2" aria-label="Swap team sides">
                Swap Sides 🔄
              </button>
            )}
            {history.length > 0 && (
              <button onClick={handleUndo} className="btn btn-ghost text-xs px-4 py-2" aria-label="Undo last action">
                ↩ Undo
              </button>
            )}
          </div>

          {/* Big +3 Score Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => handleChangePoints('A', 3)}
              disabled={isGameOver}
              className="btn-score btn-score-a flex flex-col items-center justify-center gap-1 select-none"
              aria-label={`Score hole for ${teamAName}, add 3 points`}
            >
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black block" style={{ opacity: 0.8 }}>Score Hole</span>
              <span className="text-4xl sm:text-5xl font-black">+3</span>
            </button>

            <button
              onClick={() => handleChangePoints('B', 3)}
              disabled={isGameOver}
              className="btn-score btn-score-b flex flex-col items-center justify-center gap-1 select-none"
              aria-label={`Score hole for ${teamBName}, add 3 points`}
            >
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-black block" style={{ opacity: 0.8 }}>Score Hole</span>
              <span className="text-4xl sm:text-5xl font-black">+3</span>
            </button>
          </div>
        </section>

        {/* Keyboard Hints */}
        <footer className="text-center text-[10px] font-bold hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
          <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>1</kbd> / <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>2</kbd> +3 pts
          &nbsp;·&nbsp;
          <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>Q</kbd> / <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>W</kbd> +1 pt
          &nbsp;·&nbsp;
          <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>Z</kbd> undo
        </footer>

        {/* Floating Points */}
        {floatingPoints.map(fp => (
          <FloatingPoint key={fp.id} value={fp.value} team={fp.team} onComplete={() => setFloatingPoints(prev => prev.filter(p => p.id !== fp.id))} />
        ))}
      </main>

      {/* Confetti */}
      {showConfetti && <ConfettiEffect />}

      {/* Player Picker */}
      <PlayerPicker
        isOpen={!!pickerOpen}
        onClose={() => setPickerOpen(null)}
        is2v2={matchMode === '2v2'}
        teamAName={teamAName}
        teamBName={teamBName}
        onSelect={(team, names) => setTeamName(team, names)}
      />

      {/* Match History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowHistory(false)} role="dialog" aria-modal="true" aria-label="Match History">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto card-elevated p-5 animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Match History</h2>
              <button onClick={() => setShowHistory(false)} className="btn btn-ghost h-10 w-10 rounded-full" aria-label="Close history">✕</button>
            </div>
            {matchHistory.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>No matches saved yet</p>
            ) : (
              <div className="space-y-2">
                {matchHistory.map((m) => (
                  <div key={m.id} className="card p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{m.teamAName} vs {m.teamBName}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(m.completedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black" style={{ color: m.winner === 'A' ? 'var(--color-team-a)' : 'var(--color-team-b)' }}>{m.teamAScore} - {m.teamBScore}</div>
                      <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-green)' }}>{m.winner === 'A' ? m.teamAName : m.teamBName} won</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
