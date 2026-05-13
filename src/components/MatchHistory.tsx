import { useEffect, useState } from 'react'
import { db, Match } from '../db/database'
import { motion } from 'framer-motion'

export function MatchHistory() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadMatches()
    }
  }, [isOpen])

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    const allMatches = await db.matches
      .orderBy('completedAt')
      .reverse()
      .limit(10)
      .toArray()
    setMatches(allMatches)
  }

  const clearHistory = async () => {
    if (confirm('Clear all match history?')) {
      await db.matches.clear()
      setMatches([])
    }
  }

  const exportToJSON = () => {
    const data = JSON.stringify(matches, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hole-shot-history-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Team A', 'Team B', 'Score A', 'Score B', 'Winner']
    const rows = matches.map(m => [
      new Date(m.completedAt).toLocaleString(),
      m.teamAName,
      m.teamBName,
      m.teamAScore,
      m.teamBScore,
      m.winner === 'A' ? m.teamAName : m.winner === 'B' ? m.teamBName : 'Tie'
    ])

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hole-shot-history-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="View match history"
        className="fixed bottom-4 right-4 rounded-full bg-orange-500 px-6 py-3 font-bold shadow-lg"
      >
        History ({matches.length})
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-3xl bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-orange-400">Match History</h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close match history"
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold"
            >
              Close
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportToCSV}
              aria-label="Export match history to CSV"
              className="rounded-xl bg-zinc-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-700 hover:text-white"
            >
              📥 Export CSV
            </button>
            <button
              onClick={exportToJSON}
              aria-label="Export match history to JSON"
              className="rounded-xl bg-zinc-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-700 hover:text-white"
            >
              📄 Export JSON
            </button>
            <div className="flex-1" />
            <button
              onClick={clearHistory}
              aria-label="Clear all match history"
              className="rounded-xl bg-red-600/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600 hover:text-white"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>

        {matches.length === 0 ? (
          <p className="py-8 text-center text-zinc-500">No matches saved yet</p>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="space-y-3"
          >
            {matches.map((match) => (
              <motion.div
                key={match.id}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  show: { y: 0, opacity: 1 }
                }}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-orange-500/30 hover:bg-zinc-900"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-zinc-500">
                    {new Date(match.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
                    {new Date(match.completedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-2">
                    {Math.min(match.teamAScore, match.teamBScore) <= 7 && (
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-400">
                        🦨 Skunk
                      </span>
                    )}
                    {match.winner !== 'tie' && (
                      <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400">
                        {match.winner === 'A' ? match.teamAName : match.teamBName} Won
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold">{match.teamAName}</div>
                    <div className="text-2xl font-black text-orange-400">
                      {match.teamAScore}
                    </div>
                  </div>
                  <div className="px-4 text-2xl font-bold text-zinc-600 italic">vs</div>
                  <div className="flex-1 text-right">
                    <div className="font-bold">{match.teamBName}</div>
                    <div className="text-2xl font-black text-red-400">
                      {match.teamBScore}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
