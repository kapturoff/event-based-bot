import { EventEmitter } from 'stream'
import { InlineKeyboard } from 'grammy'
import { readFileSync } from 'fs'
import DatabaseAdapter from '../../helpers/DatabaseAdapter'
import { SceneDefaultArgs } from '../../types/emitter'
import path from 'path'

const log = (...args: any[]) => console.debug('[main_page]', ...args)

export function mainPage(eventEmitter: EventEmitter, db: DatabaseAdapter) {
    const htmlPath = path.join(__dirname, 'html', '/mainPage.html')
    const messageText = readFileSync(htmlPath, { encoding: 'utf8', flag: 'r' })

    return async ({ ctx, next }: SceneDefaultArgs) => {
        log('entered mainPage')

        // To find if the user is currently in the scene, we get him from database

        const { user } = ctx.session

        if (user.isOnSession) {
            // Delegates work of handling this user by an another listener

            eventEmitter.emit('cannot_access', { ctx, next })

            // Stops the following execution of scene

            return
        }

        const keyboard = new InlineKeyboard()

        keyboard
            .add({ text: 'Начать сессию', callback_data: 'start_session' })
            .row()
            .add({ text: 'Открыть статистику', callback_data: 'show_stats' })

        await ctx.reply(messageText, { reply_markup: keyboard, parse_mode: 'HTML' })

        log('sent main page')
    }
}

export function cannotAccess(eventEmitter: EventEmitter, db: DatabaseAdapter) {
    const htmlPath = path.join(__dirname, 'html', '/cannotAccess.html')
    const messageText = readFileSync(htmlPath, { encoding: 'utf8', flag: 'r' })

    return async ({ ctx, next }: SceneDefaultArgs) => {
        log('entered cannot access')

        const keyboard = new InlineKeyboard()

        keyboard
            .add({ text: 'Продолжить сессию', callback_data: 'continue_session' })
            .row()
            .add({ text: 'Завершить сессию', callback_data: 'end_session' })

        await ctx.reply(messageText, { reply_markup: keyboard, parse_mode: 'HTML' })

        log('sent cannot access')
    }
}
