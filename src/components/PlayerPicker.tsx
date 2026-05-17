import { useEffect, useState, useRef } from 'react'
import { db, Player } from '../db/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (team: 'A' | 'B', name: string) => void
  teamAName: string
  teamBName: string
  is2v2: boolean
}

const AVATARS = ['🏃', '🕶️', '🔥', '🎯', '🤠', '🤘', '🍕', '🍺', '🏆', '🧢', '👕', '⭐', '💀', '🎱']

export function PlayerPicker({ isOpen, onClose, onSelect, teamAName, teamBName, is2v2 }: Props) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [teamA, setTeamA] = useState<string[]>([])
  const [teamB, setTeamB] = useState<string[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [search, setSearch] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const players = await db.players.toArray()
      setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)))
    }
    if (isOpen) {
      setIsClosing(false)
      loadData()
      const limit = is2v2 ? 2 : 1
      const cleanA = teamAName.split(' & ').filter(n => n && n !== 'Team A' && n !== 'Team B').slice(0, limit)
      const cleanB = teamBName.split(' & ').filter(n => n && n !== 'Team A' && n !== 'Team B').slice(0, limit)
      setTeamA(cleanA)
      setTeamB(cleanB)
      // Focus the name input when opened
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, teamAName, teamBName, is2v2])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 250)
  }

  const clearAll = () => {
    setTeamA([])
    setTeamB([])
  }

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

  const deletePlayer = async (player: Player) => {
    if (!confirm(`Remove ${player.name} from saved players?`)) return
    if (player.id) {
      await db.players.delete(player.id)
      const players = await db.players.toArray()
      setAllPlayers(players.sort((a, b) => a.name.localeCompare(b.name)))
      // Also remove from current teams
      setTeamA(prev => prev.filter(n => n !== player.name))
      setTeamB(prev => prev.filter(n => n !== player.name))
    }
  }

  const addPlayerToTeam = (name: string) => {
    const limit = is2v2 ? 2 : 1
    if (teamA.includes(name) || teamB.includes(name)) return

    if (teamA.length < limit) {
      setTeamA(prev => [...prev, name])
    } else if (teamB.length < limit) {
      setTeamB(prev => [...prev, name])
    }
  }

  const movePlayer = (name: string, from: 'A' | 'B') => {
    const limit = is2v2 ? 2 : 1
    if (from === 'A') {
      setTeamA(prev => prev.filter(n => n !== name))
      if (teamB.length < limit) setTeamB(prev => [...prev, name])
    } else {
      setTeamB(prev => prev.filter(n => n !== name))
      if (teamA.length < limit) setTeamA(prev => [...prev, name])
    }
  }

  const removePlayer = (name: string, team: 'A' | 'B') => {
    if (team === 'A') setTeamA(prev => prev.filter(n => n !== name))
    else setTeamB(prev => prev.filter(n => n !== name))
  }

  const handleConfirm = () => {
    onSelect('A', teamA.length > 0 ? teamA.join(' & ') : 'Team A')
    onSelect('B', teamB.length > 0 ? teamB.join(' & ') : 'Team B')
    handleClose()
  }

  const filteredPlayers = allPlayers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    !teamA.map(n => n.toLowerCase()).includes(p.name.toLowerCase()) &&
    !teamB.map(n => n.toLowerCase()).includes(p.name.toLowerCase())
  )

  if (!isOpen && !isClosing) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select Players"
    >
      <div
        className={`w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] p-5 sm:p-8 max-h-[90vh] overflow-y-auto ${
          isClosing ? '' : 'animate-slide-up'
        }`}
        style={{ background: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Select Players</h2>
            <p className="text-xs font-bold text-[var(--color-text-muted)] mt-1">
              {teamA.length + teamB.length} / {is2v2 ? 4 : 2} selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="btn btn-ghost text-xs text-red-400"
              aria-label="Clear all players"
            >
              Clear
            </button>
            <button
              onClick={handleClose}
              className="h-10 w-10 rounded-full flex items-center justify-center text-[var(--color-text-dim)] hover:text-white transition-colors"
              style={{ background: 'var(--color-surface-2)' }}
              aria-label="Close player picker"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Teams View */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* Team A */}
          <div className="rounded-2xl p-3" style={{ background: 'var(--color-team-a-bg)', border: '1px solid var(--color-team-a-border)' }}>
            <div className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-team-a)' }}>Team A</div>
            <div className="space-y-2 min-h-[60px]">
              {teamA.map(name => (
                <div key={name} className="flex items-center justify-between rounded-xl p-2" style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid var(--color-team-a-border)' }}>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{allPlayers.find(p => p.name === name)?.avatar || '👤'}</span>
                    <span className="truncate max-w-[80px]">{name}</span>
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => movePlayer(name, 'A')} className="h-7 w-7 rounded-lg text-xs" style={{ background: 'var(--color-surface-2)' }} aria-label={`Move ${name} to Team B`}>⇄</button>
                    <button onClick={() => removePlayer(name, 'A')} className="h-7 w-7 rounded-lg text-xs text-red-400" style={{ background: 'rgba(239, 68, 68, 0.1)' }} aria-label={`Remove ${name} from Team A`}>✕</button>
                  </div>
                </div>
              ))}
              {teamA.length === 0 && <div className="text-xs italic py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>Empty</div>}
            </div>
          </div>

          {/* Team B */}
          <div className="rounded-2xl p-3" style={{ background: 'var(--color-team-b-bg)', border: '1px solid var(--color-team-b-border)' }}>
            <div className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-team-b)' }}>Team B</div>
            <div className="space-y-2 min-h-[60px]">
              {teamB.map(name => (
                <div key={name} className="flex items-center justify-between rounded-xl p-2" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--color-team-b-border)' }}>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{allPlayers.find(p => p.name === name)?.avatar || '👤'}</span>
                    <span className="truncate max-w-[80px]">{name}</span>
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => movePlayer(name, 'B')} className="h-7 w-7 rounded-lg text-xs" style={{ background: 'var(--color-surface-2)' }} aria-label={`Move ${name} to Team A`}>⇄</button>
                    <button onClick={() => removePlayer(name, 'B')} className="h-7 w-7 rounded-lg text-xs text-red-400" style={{ background: 'rgba(239, 68, 68, 0.1)' }} aria-label={`Remove ${name} from Team B`}>✕</button>
                  </div>
                </div>
              ))}
              {teamB.length === 0 && <div className="text-xs italic py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>Empty</div>}
            </div>
          </div>
        </div>

        {/* Add New Player */}
        <section className="mb-6 rounded-2xl p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <label htmlFor="new-player-name" className="mb-2 block text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Create New Player
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="new-player-name"
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name..."
              className="flex-1 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-team-a)]"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onKeyDown={(e) => e.key === 'Enter' && createPlayer()}
              autoComplete="off"
            />
            <button
              onClick={createPlayer}
              disabled={(teamA.length + teamB.length) >= (is2v2 ? 4 : 2)}
              className="btn btn-primary rounded-xl px-5 disabled:opacity-30"
              aria-label="Add new player"
            >
              Add
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mt-3" role="radiogroup" aria-label="Select avatar">
            {AVATARS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedAvatar(emoji)}
                role="radio"
                aria-checked={selectedAvatar === emoji}
                aria-label={`Avatar ${emoji}`}
                className="flex-shrink-0 h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  background: selectedAvatar === emoji ? 'var(--color-team-a)' : 'var(--color-surface)',
                  transform: selectedAvatar === emoji ? 'scale(1.1)' : 'scale(1)',
                  border: selectedAvatar === emoji ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        {/* Quick Select */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="player-search" className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Saved Players ({allPlayers.length})
            </label>
            <input
              id="player-search"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs text-white focus:outline-none pb-1"
              style={{ background: 'transparent', borderBottom: '1px solid var(--color-border)' }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
            {filteredPlayers.map(player => (
              <div key={player.id} className="flex items-center gap-1">
                <button
                  onClick={() => addPlayerToTeam(player.name)}
                  className="flex-1 flex items-center gap-2 rounded-xl p-2 text-xs font-bold transition-colors"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)', border: '1px solid transparent' }}
                  aria-label={`Add ${player.name} to a team`}
                >
                  <span className="text-base">{player.avatar}</span>
                  <span className="truncate">{player.name}</span>
                </button>
                <button
                  onClick={() => deletePlayer(player)}
                  className="h-8 w-8 rounded-lg text-xs text-red-400 flex-shrink-0 hover:text-red-300"
                  style={{ background: 'rgba(239, 68, 68, 0.08)' }}
                  aria-label={`Delete ${player.name}`}
                >
                  🗑️
                </button>
              </div>
            ))}
            {filteredPlayers.length === 0 && (
              <div className="col-span-full py-3 text-center text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                No players found
              </div>
            )}
          </div>
        </section>

        <button
          onClick={handleConfirm}
          className="btn w-full rounded-2xl py-4 text-lg font-black text-white transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34, 197, 94, 0.25)' }}
        >
          Update Teams & Continue
        </button>
      </div>
    </div>
  )
}
