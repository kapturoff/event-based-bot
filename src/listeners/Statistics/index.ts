import { EventEmitter } from 'stream'
import { InlineKeyboard } from 'grammy'
import { readFileSync } from 'fs'
import DatabaseAdapter from '../../helpers/DatabaseAdapter'
import { render } from 'mustache'
import { SceneDefaultArgs } from '../../types/emitter'
import path from 'path'

type SessionProps = Partial<{ userGettingBackToSession: boolean }>

const log = (...args: any[]) => console.debug('[session]', ...args)

export function setDate(
    eventEmitter: EventEmitter,
    db: DatabaseAdapter,
    props?: SessionProps
) {
    const textTemplate = readFileSync(path.join(__dirname, 'html', '/startSession.html'), {
        encoding: 'utf8',
        flag: 'r',
    })

    return async ({ ctx, next }: SceneDefaultArgs) => {
        log('entered startSession')

        // We save it separately because this data will be handy for the templater

        const createdSessionAt = Date.now()

        /**
         * If users enters this scene for the first time (via "start_scene" listener),
         * it will start new session. 
         * 
         * Otherwise, for example, if user enters this scene via "continue_scene" 
         * listener, it won't start new session, but rather will just send an interface.
         */

        if (!props?.userGettingBackToSession) await db.startSession(ctx.from.id, createdSessionAt)

        const keyboard = new InlineKeyboard()

        keyboard.add({ text: 'Закончить сессию', callback_data: 'end_session' })

        log('rendering message for startSession')

        const compiledText = render(textTemplate, {
            startSessionDate: new Date(createdSessionAt),
        })

        await ctx.reply(compiledText, { reply_markup: keyboard, parse_mode: 'HTML' })

        log('sent message for startSession')
    }
}

export function endSession(eventEmitter: EventEmitter, db: DatabaseAdapter) {
    const textTemplate = readFileSync(path.join(__dirname, 'html', '/endSession.html'), {
        encoding: 'utf8',
        flag: 'r',
    })

    return async ({ ctx, next }: SceneDefaultArgs) => {
        log('entered endSession')

        // Stopping the session and also getting it from database to find out how much time it took

        const endedSession = await db.stopSession(ctx.from.id)

        // Gets timestamp of the beginning of this day

        const dayBeginningTimestamp = new Date(new Date().setHours(0, 0, 0, 0))

        // Calculates sum of time of all sessions that took place after this day began in hours

        const dailySessionsIntervalsSum = await db.countAllSessionIntervalsFrom(
            dayBeginningTimestamp,
            ctx.from.id
        )

        // Calculates duration of the just ended session in minutes

        const currentSessionDuration = Math.round(
            (endedSession.endedAt.getTime() - endedSession.startedAt.getTime()) / 1000 / 60
        )

        const keyboard = new InlineKeyboard()

        keyboard
            .add({ text: 'Вернуться в главное меню', callback_data: 'main_page' })
            .row()
            .add({ text: 'Начать новую сессию', callback_data: 'start_session' })

        log('rendering message for endSession')

        const compiledText = render(textTemplate, {
            dailySessionsIntervalsSum,
            currentSessionDuration,
        })

        await ctx.reply(compiledText, { reply_markup: keyboard, parse_mode: 'HTML' })

        log('sent message for endSession')
    }
}
