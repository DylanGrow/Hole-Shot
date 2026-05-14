import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Locale, t } from '../i18n'

interface Matchup {
  id: string
  team1: string
  team2: string
  winner: string | null
  score1?: number
  score2?: number
}

export function TournamentBracket({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false)
  const [matches, setMatches] = useState<Matchup[]>([
    { id: 'm1', team1: 'Team 1', team2: 'Team 2', winner: null },
    { id: 'm2', team1: 'Team 3', team2: 'Team 4', winner: null },
    { id: 'm3', team1: 'TBD', team2: 'TBD', winner: null }, // Final
  ])

  const setWinner = (matchId: string, teamName: string) => {
    setMatches(prev => {
      const next = prev.map(m => m.id === matchId ? { ...m, winner: teamName } : m)
      
      // Update Final (m3) based on semi-final winners
      if (matchId === 'm1') next[2].team1 = teamName
      if (matchId === 'm2') next[2].team2 = teamName
      
      return next
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full glass px-6 py-3 font-black text-sm tracking-widest uppercase shadow-lg border-purple-500/20 text-purple-400"
      >
        {t(locale, 'tournament')} 🏆
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl rounded-[40px] glass border-white/10 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">{t(locale, 'tournamentTitle')}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t(locale, 'semiFinals')}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-2xl bg-zinc-800 p-3 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-12 py-8">
          {/* Semi Finals */}
          <div className="flex flex-col gap-12 w-full max-w-[200px]">
            {[matches[0], matches[1]].map(m => (
              <div key={m.id} className="relative space-y-2">
                <div className="absolute -right-6 top-1/2 h-px w-6 bg-zinc-700" />
                {[m.team1, m.team2].map(team => (
                  <button
                    key={team}
                    onClick={() => setWinner(m.id, team)}
                    className={`w-full rounded-xl p-3 text-xs font-bold transition-all ${
                      m.winner === team ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Connectors */}
          <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-zinc-800 via-orange-500/50 to-zinc-800" />

          {/* Finals */}
          <div className="w-full max-w-[220px]">
            <div className="text-center mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">{t(locale, 'championship')}</span>
            </div>
            <div className="space-y-2">
              {[matches[2].team1, matches[2].team2].map(team => (
                <button
                  key={team}
                  onClick={() => setWinner('m3', team)}
                  className={`w-full rounded-2xl p-6 text-sm font-black transition-all ${
                    matches[2].winner === team ? 'bg-green-600 text-white shadow-xl shadow-green-600/40' : 'bg-white/5 text-zinc-500'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
            {matches[2].winner && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="mt-6 text-center"
              >
                <div className="text-4xl mb-2">👑</div>
                <div className="text-xl font-black text-white uppercase tracking-tighter">{matches[2].winner}</div>
                <div className="text-[10px] font-bold text-zinc-500">{t(locale, 'champion')}</div>
              </motion.div>
            )}
          </div>
        </div>

        <button
          onClick={() => setMatches([
            { id: 'm1', team1: 'Team 1', team2: 'Team 2', winner: null },
            { id: 'm2', team1: 'Team 3', team2: 'Team 4', winner: null },
            { id: 'm3', team1: 'TBD', team2: 'TBD', winner: null },
          ])}
          className="mt-8 w-full rounded-2xl border border-white/5 py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
        >
          {t(locale, 'resetBracket')}
        </button>
      </motion.div>
    </motion.div>
  )
}
