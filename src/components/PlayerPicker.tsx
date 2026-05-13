import { useEffect, useState } from 'react'
import { db } from '../db/database'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (names: string) => void
  currentName: string
  is2v2: boolean
}

export function PlayerPicker({ isOpen, onClose, onSelect, currentName, is2v2 }: Props) {
  const [players, setPlayers] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    const loadPlayers = async () => {
      const matches = await db.matches.toArray()
      const names = new Set<string>()
      matches.forEach(m => {
        // Extract individual names if it was a 2v2 (handle "Name & Name")
        const teamANames = m.teamAName.split(' & ')
        const teamBNames = m.teamBName.split(' & ')
        teamANames.forEach(n => names.add(n.trim()))
        teamBNames.forEach(n => names.add(n.trim()))
      })
      setPlayers(Array.from(names).sort())
    }
    if (isOpen) {
      loadPlayers()
      const initial = currentName.split(' & ').map(n => n.trim())
      setSelected(initial)
    }
  }, [isOpen, currentName])

  const togglePlayer = (name: string) => {
    const limit = is2v2 ? 2 : 1
    if (selected.includes(name)) {
      setSelected(selected.filter(n => n !== name))
    } else if (selected.length < limit) {
      setSelected([...selected, name])
    }
  }

  const handleConfirm = () => {
    if (selected.length > 0) {
      onSelect(selected.join(' & '))
      onClose()
    }
  }

  const addCustom = () => {
    if (customName.trim()) {
      const limit = is2v2 ? 2 : 1
      if (selected.length < limit && !selected.includes(customName.trim())) {
        setSelected([...selected, customName.trim()])
        setCustomName('')
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-[40px] glass border-white/10 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-black text-white">Select {is2v2 ? 'Players' : 'Player'}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {selected.length} / {is2v2 ? 2 : 1} Selected
              </p>
            </div>

            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Add new player..."
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              />
              <button
                onClick={addCustom}
                className="rounded-2xl bg-orange-500 px-6 font-bold text-white shadow-lg shadow-orange-500/20"
              >
                Add
              </button>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {players.map(player => (
                <button
                  key={player}
                  onClick={() => togglePlayer(player)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition-all border ${
                    selected.includes(player)
                      ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20'
                      : 'bg-white/5 border-transparent text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {player}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-zinc-800 py-4 font-black text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.length === 0}
                className="flex-2 rounded-2xl bg-green-600 py-4 font-black text-white shadow-lg shadow-green-600/20 disabled:opacity-30"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
