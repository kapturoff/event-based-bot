import { readFile } from 'fs/promises'
import { Database } from 'sqlite'
import { Session, User } from '../../types/database'

const log = (...args: any[]) => console.debug('[database_adapter]', ...args)

/**
 * _Gives top-level methods to work with the database._
 *
 * Connection that is needed to be provided may be created like this:
 * ```js
 * const db = new DatabaseAdapter(
 *      await sqlite.open({ driver: sqlite3.Database, filename })
 * )
 * ```
 */
export default class DatabaseAdapter {
    private readonly db: Database

    constructor(database: Database) {
        this.db = database
    }

    /**
     * Creates database schema if it does not exist at this moment.
     */
    async establishSchema() {
        log('establishing schema, loading init.sql...')

        const sql = await readFile(__dirname + '/init.sql', { encoding: 'utf-8', flag: 'r' }),
            sqlCommands: string[] = sql
                .replace(/\n/g, '') // Removing any new lines
                .split(/;/) // Seperating commands by ";" symbol
                .filter((a) => !!a) // Removing empty strings
                .map((command) => command.trim()) // Removing spaces around command

        log('loaded! running migrations...')

        const pendingCommands = sqlCommands.map(async (command) => {
            // This awful sequence of symbols makes text cyan colored

            log('running command ', `\x1b[36m${command}\x1b[0m`)

            return this.db.run(command)
        })

        // Waits for the end of all pending operations

        await Promise.all(pendingCommands)

        log('migrated!')
    }

    /**
     * Looks for an user in database and creates them if there's no user found.
     *
     * @param telegramId Telegram ID of an user
     * @returns Camel case formatted database data as first argument and the _«was just created»_ (as boolean) flag as the second
     */
    async getUserByTelegramId(telegramId: User['telegramId']): Promise<[User, boolean]> {
        const userFound = await this.db.get(
            'SELECT * FROM users WHERE telegram_id = ?',
            telegramId
        )

        if (userFound) {
            // Formatting database output in camel case

            const userFormatted: User = {
                telegramId,
                isOnSession: userFound['is_on_session'],
                isSettingDate: userFound['is_setting_date'],
            }

            // False here means that user was in the database before

            return [userFormatted, false]
        }

        // Inserts new user in the database

        await this.db.run('INSERT INTO users (telegram_id) VALUES (?)', telegramId)

        // Gets a just created user from database again to return it later

        const userCreated = await this.db.get(
            'SELECT * FROM users WHERE telegram_id = ?',
            telegramId
        )

        // Formatting the database output again (since previous formatting is only
        // available if an user found)

        const userFormatted: User = {
            telegramId,
            isOnSession: userCreated['is_on_session'],
            isSettingDate: userCreated['is_setting_date'],
        }

        // True here means that the user was just created

        return [userFormatted, true]
    }

    /**
     * Creates new session in the database and also marks
     * that the user that was provided is on session now.
     *
     * @param telegramId Telegram ID of an user
     * @param createdAt Timestamp from time when session was created
     */
    async startSession(telegramId: User['telegramId'], createdAt: number) {
        await this.db.run(
            'INSERT INTO sessions (user_id, started_at) VALUES (?, ?)',
            telegramId,
            createdAt
        )

        await this.db.run(
            'UPDATE users SET is_on_session = true WHERE telegram_id = ?',
            telegramId
        )
    }

    /**
     * This sets the ending date (the timestamp, if saying more clearly)
     * on the session instance and also sets `is_on_session` field of user to
     * `false`.
     *
     * @param userTelegramId Telegram ID of an user
     * @returns Session that was just ended
     */
    async stopSession(userTelegramId: User['telegramId']): Promise<Session> {
        // Setting end date of this sessions

        await this.db.run(
            'UPDATE sessions SET ended_at = ? WHERE user_id = ? and ended_at IS NULL',
            Date.now(),
            userTelegramId
        )

        // Setting is_on_session field of user to false

        await this.db.run(
            'UPDATE users SET is_on_session = false WHERE telegram_id = ?',
            userTelegramId
        )

        // Gets session from database. Database uses the Snake-case, so we'll need to convert it to the Camel case

        const rawSession = await this.db.get(
            'SELECT * FROM sessions ORDER BY ended_at DESC LIMIT 1'
        )

        return this.formatSession(rawSession)
    }

    /**
     * Gets all sessions that were ended before given date.
     *
     * @param datetime The last date and time from that we need to look for sessions
     * @returns All sessions that were going after provided date and time
     */
    private async getAllSessionsEndedAfter(
        datetime: Date,
        userTelegramId: User['telegramId']
    ): Promise<Session[]> {
        const rawSessions = await this.db.all(
            'SELECT * FROM sessions WHERE user_id = ? AND ended_at > ?',
            userTelegramId,
            datetime.getTime()
        )

        return rawSessions.map((rawSession) => this.formatSession(rawSession))
    }

    /**
     * Count all time intervals of sessions that was going right in and after
     * provided date and time.
     *
     * It uses approach of using `ended_at` rather than `created_at`, because
     * it needs to add sessions that were going _right in the given date too_.
     *
     * _Imagine_ if an user had started a session in 06/22/2022 `at 6:15` and
     * had ended it in 06/22/2022 `at 7:00`. Using this function, we want to
     * get all sessions of this user, starting from 06/22/2022 `6:30`. **This method
     * definetely must include that session that started at `6:15`, because it took
     * place in the chosen date and time.**
     *
     * @param datetime The last date and time from that we need to look for sessions
     * @returns Summarized intervals that were going after provided date and time _(in hours)_
     */
    async countAllSessionIntervalsFrom(
        datetime: Date,
        userTelegramId: User['telegramId']
    ): Promise<number> {
        const sessionsAfterDate = await this.getAllSessionsEndedAfter(datetime, userTelegramId)

        const sumOfTimeIntervals = sessionsAfterDate.reduce(
            (acc, session) => session.endedAt.getTime() - session.startedAt.getTime(),
            0
        )

        const sumInHours = sumOfTimeIntervals / 1000 / 60 / 60

        return Number(sumInHours.toFixed(1))
    }

    private formatSession(rawSession: any): Session {
        return {
            startedAt: new Date(rawSession.started_at),
            endedAt: new Date(rawSession.ended_at),
            userId: rawSession.user_id,
        }
    }
}
