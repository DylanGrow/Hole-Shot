import { motion } from 'framer-motion'

interface Props {
  label: string
  score: number
  isWinner?: boolean
  onAdjust?: (amount: number) => void
}

export function Scoreboard({ label, score, isWinner, onAdjust }: Props) {
  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden rounded-[32px] border p-8 shadow-2xl transition-all duration-700 ${
        isWinner 
          ? 'border-green-500/50 bg-green-500/10 ring-4 ring-green-500/20' 
          : 'glass border-white/5'
      }`}
    >
      {/* Decorative background glow */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-20 ${
        isWinner ? 'bg-green-500' : 'bg-orange-500'
      }`} />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
            {label}
          </div>
          {isWinner && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              className="text-xl"
            >
              🏆
            </motion.span>
          )}
        </div>

        <div className="flex items-center justify-center gap-6">
          {onAdjust && !isWinner && (
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-2xl font-bold text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
            >
              −
            </motion.button>
          )}
          
          <motion.div
            key={score}
            initial={{ y: 20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className={`text-center text-9xl font-black tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.3)] ${
              isWinner ? 'text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'text-white'
            }`}
          >
            {score}
          </motion.div>

          {onAdjust && !isWinner && (
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-2xl font-bold text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
            >
              +
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
