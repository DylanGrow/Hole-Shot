import { useEffect, useState } from 'react'
import { db, Match } from '../db/database'
import { motion } from 'framer-motion'
import { t, Locale } from '../i18n'

export function MatchHistory({ locale }: { locale: Locale }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNames, setEditNames] = useState({ a: '', b: '' })

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

  const startEditing = (match: Match) => {
    setEditingId(match.id!)
    setEditNames({ a: match.teamAName, b: match.teamBName })
  }

  const saveEdit = async (id: number) => {
    await db.matches.update(id, {
      teamAName: editNames.a,
      teamBName: editNames.b
    })
    setEditingId(null)
    loadMatches()
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

  const exportMatchImage = (match: Match) => {
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
    ctx.fillStyle = match.winner === 'A' ? '#22c55e' : '#ffffff'
    ctx.fillText(match.teamAName.toUpperCase(), 350, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(match.teamAScore.toString(), 350, 500)

    // VS
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = '#3f3f46'
    ctx.fillText('VS', 600, 420)

    // Team B
    ctx.font = 'bold 60px sans-serif'
    ctx.fillStyle = match.winner === 'B' ? '#22c55e' : '#ffffff'
    ctx.fillText(match.teamBName.toUpperCase(), 850, 350)
    ctx.font = 'bold 150px sans-serif'
    ctx.fillText(match.teamBScore.toString(), 850, 500)

    // Winner Badge
    if (match.winner !== 'tie') {
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 30px sans-serif'
      const winnerX = match.winner === 'A' ? 350 : 850
      ctx.fillText('WINNER 🏆', winnerX, 550)
    }

    // Date
    ctx.fillStyle = '#52525b'
    ctx.font = '20px monospace'
    ctx.fillText(new Date(match.completedAt).toLocaleString(), 600, 580)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `hole-shot-${match.teamAName}-vs-${match.teamBName}.png`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }, 'image/png')
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
                    {(match.teamAScore === 0 && match.teamBScore >= 11) || (match.teamBScore === 0 && match.teamAScore >= 11) ? (
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-400">
                        🦨 Skunk (11-0)
                      </span>
                    ) : null}
                    {match.winner !== 'tie' && (
                      <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400">
                        {match.winner === 'A' ? match.teamAName : match.teamBName} Won
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); exportMatchImage(match); }}
                      className="rounded-full bg-white/5 p-1 text-xs hover:bg-white/10 transition-colors"
                      title="Export as image"
                    >
                      📸
                    </button>
                  </div>
                </div>
                {editingId === match.id ? (
                  <div className="mt-2 space-y-3 rounded-xl bg-white/5 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-team-a" className="text-[10px] font-bold uppercase text-zinc-500">Team A</label>
                        <input
                          id="edit-team-a"
                          title="Team A Name"
                          placeholder="Team A Name"
                          value={editNames.a}
                          onChange={(e) => setEditNames({ ...editNames, a: e.target.value })}
                          className="w-full rounded-lg bg-zinc-800 p-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-team-b" className="text-[10px] font-bold uppercase text-zinc-500">Team B</label>
                        <input
                          id="edit-team-b"
                          title="Team B Name"
                          placeholder="Team B Name"
                          value={editNames.b}
                          onChange={(e) => setEditNames({ ...editNames, b: e.target.value })}
                          className="w-full rounded-lg bg-zinc-800 p-2 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg bg-zinc-700 py-2 text-xs font-bold">Cancel</button>
                      <button onClick={() => saveEdit(match.id!)} className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between" onClick={() => startEditing(match)}>
                    <div className="flex-1 group cursor-pointer">
                      <div className="font-bold flex items-center gap-2">
                        {match.teamAName}
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500">✎</span>
                      </div>
                      <div className="text-2xl font-black text-orange-400">
                        {match.teamAScore}
                      </div>
                    </div>
                    <div className="px-4 text-2xl font-bold text-zinc-600 italic">vs</div>
                    <div className="flex-1 text-right group cursor-pointer">
                      <div className="font-bold flex items-center justify-end gap-2">
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500">✎</span>
                        {match.teamBName}
                      </div>
                      <div className="text-2xl font-black text-red-400">
                        {match.teamBScore}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
