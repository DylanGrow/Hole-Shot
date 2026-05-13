import { useEffect, useState } from 'react'
import { db } from '../db/database'
import { motion } from 'framer-motion'

interface PlayerStats {
  name: string
  wins: number
  points: number
  matches: number
}

export function PlayerLeaderboard() {
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) calculateStats()
  }, [isOpen])

  const calculateStats = async () => {
    const matches = await db.matches.toArray()
    const playerMap: Record<string, PlayerStats> = {}

    matches.forEach(m => {
      [m.teamAName, m.teamBName].forEach((name, i) => {
        if (!playerMap[name]) {
          playerMap[name] = { name, wins: 0, points: 0, matches: 0 }
        }
        playerMap[name].matches++
        playerMap[name].points += i === 0 ? m.teamAScore : m.teamBScore
        
        const winnerName = m.winner === 'A' ? m.teamAName : m.teamBName
        if (winnerName === name) playerMap[name].wins++
      })
    })

    const sortedStats = Object.values(playerMap).sort((a, b) => b.wins - a.wins || b.points - a.points)
    setStats(sortedStats)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="View Hall of Fame and player statistics"
        className="fixed bottom-4 left-4 rounded-full glass px-6 py-3 font-black text-sm tracking-widest uppercase shadow-lg border-orange-500/20 text-orange-400"
      >
        Hall of Fame 🏆
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-[40px] glass border-white/10 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">Hall of Fame</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">All-Time Standings</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close Hall of Fame"
            className="rounded-2xl bg-zinc-800 p-3 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 max-h-[calc(80vh-180px)]">
          {stats.length === 0 ? (
            <p className="py-12 text-center text-zinc-500 italic">No legends yet. Play a match!</p>
          ) : (
            stats.map((player, i) => (
              <div
                key={player.name}
                className="group flex items-center justify-between rounded-3xl bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl font-black ${
                    i === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
                    i === 1 ? 'bg-zinc-300 text-black' :
                    i === 2 ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-black text-white">{player.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {player.matches} Matches
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-orange-400">{player.wins} Wins</div>
                  <div className="text-[10px] font-bold text-zinc-500">{player.points} Total Pts</div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
