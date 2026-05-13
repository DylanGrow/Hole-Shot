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

export interface Player {
  id?: number
  name: string
  avatar: string
  createdAt: Date
}

export class MatchDatabase extends Dexie {
  matches!: Table<Match>
  players!: Table<Player>

  constructor() {
    super('HoleShotDB')
    this.version(2).stores({
      matches: '++id, completedAt, winner',
      players: '++id, &name'
    })
  }
}

export const db = new MatchDatabase()

// Made with Bob
