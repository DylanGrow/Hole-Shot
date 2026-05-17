import { useRef, useEffect } from 'react'

interface Props {
  label: string
  score: number
  isWinner?: boolean
  team: 'A' | 'B'
  onFire?: boolean
}

export function Scoreboard({ label, score, isWinner, team, onFire }: Props) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const prevScore = useRef(score)

  useEffect(() => {
    if (score !== prevScore.current && scoreRef.current) {
      // Trigger pop animation on score change
      scoreRef.current.classList.remove('animate-score-pop')
      // Force reflow to restart animation
      void scoreRef.current.offsetWidth
      scoreRef.current.classList.add('animate-score-pop')
      prevScore.current = score
    }
  }, [score])

  const teamColor = team === 'A' ? 'var(--color-team-a)' : 'var(--color-team-b)'
  const winColor = 'var(--color-green)'

  return (
    <div
      className={`card-elevated relative overflow-hidden p-4 sm:p-6 flex flex-col items-center justify-center transition-all duration-300 ${
        isWinner ? 'animate-pulse-glow' : ''
      }`}
      style={{
        borderColor: isWinner ? winColor : `${teamColor}33`,
        borderWidth: isWinner ? '2px' : '1px',
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: isWinner ? winColor : teamColor }}
      />

      {/* Fire indicator */}
      {onFire && (
        <div className="absolute -left-1 -top-1 z-20 text-2xl animate-fire" aria-hidden="true">
          🔥
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="mb-1 flex items-center justify-center gap-2 max-w-full px-1">
          <span
            className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide truncate max-w-[140px] sm:max-w-[180px]"
            style={{ color: isWinner ? winColor : teamColor }}
          >
            {label}
          </span>
          {isWinner && (
            <span className="text-xl flex-shrink-0" role="img" aria-label="Winner trophy">
              🏆
            </span>
          )}
        </div>

        <div
          ref={scoreRef}
          className="text-center font-black tracking-tighter leading-none"
          style={{
            fontSize: 'var(--text-score)',
            color: isWinner ? winColor : 'var(--color-text)',
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {score}
        </div>
      </div>
    </div>
  )
}
