import { useEffect, useState } from 'react'
import { db, Player } from '../db/database'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (team: 'A' | 'B', name: string) => void
  teamAName: string
  teamBName: string
  is2v2: boolean
}

const AVATARS = ['🏃', '🕶️', '🔥', '🎯', '🤠', '🤘', '🍕', '🍺', '🏆', '🧢', '👕', '🕶️', '⭐', '💀']

export function PlayerPicker({ isOpen, onClose, onSelect, teamAName, teamBName, is2v2 }: Props) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [teamA, setTeamA] = useState<string[]>([])
  const [teamB, setTeamB] = useState<string[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const players = await db.players.toArray()
      setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)))
    }
    if (isOpen) {
      loadData()
      setTeamA(teamAName.split(' & ').filter(n => n && n !== 'Team A'))
      setTeamB(teamBName.split(' & ').filter(n => n && n !== 'Team B'))
    }
  }, [isOpen, teamAName, teamBName])

  const createPlayer = async () => {
    if (!newPlayerName.trim()) return
    const exists = allPlayers.find(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())
    if (!exists) {
      const newPlayer: Player = {
        name: newPlayerName.trim(),
        avatar: selectedAvatar,
        createdAt: new Date()
      }
      await db.players.add(newPlayer)
      const players = await db.players.toArray()
      setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)))
      addPlayerToTeam(newPlayer.name)
    } else {
      addPlayerToTeam(exists.name)
    }
    setNewPlayerName('')
  }

  const addPlayerToTeam = (name: string) => {
    const limit = is2v2 ? 2 : 1
    if (teamA.includes(name) || teamB.includes(name)) return

    if (teamA.length < limit) {
      setTeamA([...teamA, name])
    } else if (teamB.length < limit) {
      setTeamB([...teamB, name])
    }
  }

  const movePlayer = (name: string, from: 'A' | 'B') => {
    const limit = is2v2 ? 2 : 1
    if (from === 'A') {
      setTeamA(teamA.filter(n => n !== name))
      if (teamB.length < limit) setTeamB([...teamB, name])
    } else {
      setTeamB(teamB.filter(n => n !== name))
      if (teamA.length < limit) setTeamA([...teamA, name])
    }
  }

  const removePlayer = (name: string, team: 'A' | 'B') => {
    if (team === 'A') setTeamA(teamA.filter(n => n !== name))
    else setTeamB(teamB.filter(n => n !== name))
  }

  const handleConfirm = () => {
    onSelect('A', teamA.length > 0 ? teamA.join(' & ') : 'Team A')
    onSelect('B', teamB.length > 0 ? teamB.join(' & ') : 'Team B')
    onClose()
  }

  const filteredPlayers = allPlayers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    !teamA.includes(p.name) && 
    !teamB.includes(p.name)
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/95 p-0 sm:p-4 backdrop-blur-2xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full max-w-2xl overflow-hidden rounded-t-[40px] sm:rounded-[40px] border-t border-white/10 bg-zinc-950/50 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-3xl font-black text-white tracking-tight">Team Setup</h2>
              <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">✕</button>
            </div>

            {/* Current Teams View */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-orange-500/5 border border-orange-500/20 p-4">
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-orange-500/60">Team A</div>
                <div className="space-y-2 min-h-[80px]">
                  {teamA.map(name => (
                    <motion.div layoutId={name} key={name} className="flex items-center justify-between rounded-xl bg-orange-500/10 p-2 border border-orange-500/20">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{allPlayers.find(p => p.name === name)?.avatar || '👤'}</span>
                        {name}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => movePlayer(name, 'A')} className="h-6 w-6 rounded-lg bg-white/5 text-[10px] text-zinc-400 hover:text-white">⇄</button>
                        <button onClick={() => removePlayer(name, 'A')} className="h-6 w-6 rounded-lg bg-red-500/10 text-[10px] text-red-500">✕</button>
                      </div>
                    </motion.div>
                  ))}
                  {teamA.length === 0 && <div className="text-[10px] text-zinc-700 italic py-4 text-center">Empty</div>}
                </div>
              </div>

              <div className="rounded-3xl bg-red-500/5 border border-red-500/20 p-4">
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-red-500/60">Team B</div>
                <div className="space-y-2 min-h-[80px]">
                  {teamB.map(name => (
                    <motion.div layoutId={name} key={name} className="flex items-center justify-between rounded-xl bg-red-500/10 p-2 border border-red-500/20">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{allPlayers.find(p => p.name === name)?.avatar || '👤'}</span>
                        {name}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => movePlayer(name, 'B')} className="h-6 w-6 rounded-lg bg-white/5 text-[10px] text-zinc-400 hover:text-white">⇄</button>
                        <button onClick={() => removePlayer(name, 'B')} className="h-6 w-6 rounded-lg bg-red-500/10 text-[10px] text-red-500">✕</button>
                      </div>
                    </motion.div>
                  ))}
                  {teamB.length === 0 && <div className="text-[10px] text-zinc-700 italic py-4 text-center">Empty</div>}
                </div>
              </div>
            </div>

            {/* Add New Player Section */}
            <section className="mb-8 rounded-3xl bg-white/5 p-6 border border-white/10">
              <div className="mb-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Create New Player</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player name..."
                    className="flex-1 rounded-2xl bg-zinc-900 border border-white/5 px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                    onKeyDown={(e) => e.key === 'Enter' && createPlayer()}
                  />
                  <button onClick={createPlayer} className="rounded-2xl bg-orange-500 px-6 font-bold text-white">Add</button>
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`flex-shrink-0 h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      selectedAvatar === emoji ? 'bg-orange-500 scale-110 shadow-lg' : 'bg-white/5 grayscale hover:grayscale-0'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </section>

            {/* Quick Select Section */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quick Select ({allPlayers.length})</label>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none border-b border-white/10 pb-1"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredPlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => addPlayerToTeam(player.name)}
                    className="flex items-center gap-2 rounded-xl bg-white/5 p-2 text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10"
                  >
                    <span className="text-base">{player.avatar}</span>
                    <span className="truncate">{player.name}</span>
                  </button>
                ))}
                {filteredPlayers.length === 0 && <div className="col-span-full py-4 text-center text-[10px] text-zinc-600 italic">No matches found</div>}
              </div>
            </section>

            <button
              onClick={handleConfirm}
              className="w-full rounded-2xl bg-gradient-to-r from-green-600 to-green-500 py-4 text-lg font-black text-white shadow-xl shadow-green-600/20 active:scale-[0.98] transition-all"
            >
              Update Teams & Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
