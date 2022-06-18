export interface User {
    telegramId: number
    isOnSession: boolean
    isSettingDate: boolean
}

export interface Session {
    startedAt: Date
    endedAt: Date
    userId: User['telegramId']
}
