import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/database'

interface HistoryEntry {
  team: 'A' | 'B'
  points: number
  teamAScore: number
  teamBScore: number
}

interface MatchState {
  teamA: number
  teamB: number
  teamAName: string
  teamBName: string
  history: HistoryEntry[]
  addPoints: (team: 'A' | 'B', points: number) => void
  undo: () => void
  reset: () => void
  saveMatch: () => Promise<void>
  setTeamName: (team: 'A' | 'B', name: string) => void
  adjustScore: (team: 'A' | 'B', amount: number) => void
  addPointsWithCancellation: (team: 'A' | 'B', points: number) => void
  winTarget: number
  setWinTarget: (target: number) => void
}

const STORAGE_KEY = 'hole-shot-match'

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      teamA: 0,
      teamB: 0,
      teamAName: 'Team A',
      teamBName: 'Team B',
      history: [],
      winTarget: 21,

      addPoints: (team, points) =>
        set((state) => {
          const isSkunk = (state.teamA >= 11 && state.teamB === 0) || (state.teamB >= 11 && state.teamA === 0)
          if (state.teamA >= 21 || state.teamB >= 21 || isSkunk) return state

          let newTeamA = team === 'A' ? state.teamA + points : state.teamA
          let newTeamB = team === 'B' ? state.teamB + points : state.teamB

          // Cap at 21
          if (newTeamA > 21) newTeamA = 21
          if (newTeamB > 21) newTeamB = 21
          
          return {
            teamA: newTeamA,
            teamB: newTeamB,
            history: [
              ...state.history,
              {
                team,
                points,
                teamAScore: newTeamA,
                teamBScore: newTeamB
              }
            ]
          }
        }),

      addPointsWithCancellation: (team, points) =>
        set((state) => {
          const isSkunk = (state.teamA >= 11 && state.teamB === 0) || (state.teamB >= 11 && state.teamA === 0)
          if (state.teamA >= 21 || state.teamB >= 21 || isSkunk) return state

          const oppScore = team === 'A' ? state.teamB : state.teamA
          const deduction = Math.min(points, oppScore)

          let newTeamA = state.teamA
          let newTeamB = state.teamB

          if (team === 'A') {
            newTeamA = Math.min(21, state.teamA + points)
            newTeamB = Math.max(0, state.teamB - deduction)
          } else {
            newTeamB = Math.min(21, state.teamB + points)
            newTeamA = Math.max(0, state.teamA - deduction)
          }

          return {
            teamA: newTeamA,
            teamB: newTeamB,
            history: [
              ...state.history,
              {
                team,
                points,
                teamAScore: newTeamA,
                teamBScore: newTeamB
              }
            ]
          }
        }),

      adjustScore: (team, amount) =>
        set((state) => {
          let newTeamA = team === 'A' ? Math.min(21, Math.max(0, state.teamA + amount)) : state.teamA
          let newTeamB = team === 'B' ? Math.min(21, Math.max(0, state.teamB + amount)) : state.teamB
          
          return {
            teamA: newTeamA,
            teamB: newTeamB,
            history: [
              ...state.history,
              {
                team,
                points: amount,
                teamAScore: newTeamA,
                teamBScore: newTeamB
              }
            ]
          }
        }),

      undo: () =>
        set((state) => {
          if (state.history.length === 0) return state

          const newHistory = state.history.slice(0, -1)
          const lastEntry = newHistory[newHistory.length - 1]

          return {
            teamA: lastEntry ? lastEntry.teamAScore : 0,
            teamB: lastEntry ? lastEntry.teamBScore : 0,
            history: newHistory
          }
        }),

      reset: () => set({ teamA: 0, teamB: 0, history: [] }),

      saveMatch: async () => {
        const state = get()
        if (state.teamA === 0 && state.teamB === 0) return

        const winner =
          state.teamA > state.teamB || (state.teamA >= 11 && state.teamB === 0) ? 'A' :
          state.teamB > state.teamA || (state.teamB >= 11 && state.teamA === 0) ? 'B' :
          'tie'

        await db.matches.add({
          teamAName: state.teamAName,
          teamBName: state.teamBName,
          teamAScore: state.teamA,
          teamBScore: state.teamB,
          winner,
          completedAt: new Date()
        })

        set({ teamA: 0, teamB: 0, history: [] })
      },

      setTeamName: (team, name) =>
        set((state) => ({
          teamAName: team === 'A' ? name : state.teamAName,
          teamBName: team === 'B' ? name : state.teamBName
        })),

      setWinTarget: () => set({ winTarget: 21 })
    }),
    {
      name: STORAGE_KEY
    }
  )
)
