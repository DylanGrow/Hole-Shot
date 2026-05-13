import Dexie, { Table } from 'dexie'

export interface Match {
  id?: number
  teamAName: string
  teamBName: string
  teamAScore: number
  teamBScore: number
  winner: 'A' | 'B' | 'tie'
  completedAt: Date
}

export class MatchDatabase extends Dexie {
  matches!: Table<Match>

  constructor() {
    super('HoleShotDB')
    this.version(1).stores({
      matches: '++id, completedAt, winner'
    })
  }
}

export const db = new MatchDatabase()

// Made with Bob
