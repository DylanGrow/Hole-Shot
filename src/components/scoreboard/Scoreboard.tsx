import { motion } from 'framer-motion'

interface Props {
  label: string
  score: number
  isWinner?: boolean
}

export function Scoreboard({ label, score, isWinner }: Props) {
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden rounded-[32px] border p-4 sm:p-6 shadow-2xl transition-all duration-700 flex flex-col items-center justify-center ${
        isWinner
          ? 'border-green-500/50 bg-green-500/10 ring-4 ring-green-500/20'
          : 'glass border-white/5'
      }`}
    >
      {/* Decorative background glow */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-20 ${
        isWinner ? 'bg-green-500' : 'bg-orange-500'
      }`} />

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="mb-2 flex items-center justify-center gap-2 max-w-full px-1">
          <span className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-white drop-shadow-md truncate max-w-[140px] sm:max-w-[180px]">
            {label}
          </span>
          {isWinner && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              className="text-xl flex-shrink-0"
            >
              🏆
            </motion.span>
          )}
        </div>

        <motion.div
          key={score}
          initial={{ y: 15, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`text-center text-8xl sm:text-9xl font-black tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.3)] ${
            isWinner ? 'text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'text-white'
          }`}
        >
          {score}
        </motion.div>
      </div>
    </motion.div>
  )
}
