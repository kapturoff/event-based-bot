import { EventEmitter } from 'stream'
import { InlineKeyboard } from 'grammy'
import { readFileSync } from 'fs'
import DatabaseAdapter from '../../helpers/DatabaseAdapter'
import { SceneDefaultArgs } from '../../types/emitter'

const log = (...args: any[]) => console.debug('[main_page]', ...args)

export default function (eventEmitter: EventEmitter, db: DatabaseAdapter) {
    const messageText = readFileSync(__dirname + '/text.html', {
        encoding: 'utf8',
        flag: 'r',
    })

    return async ({ ctx, next }: SceneDefaultArgs) => {
        log('entered')

        /**
         * We run it here, because this is the first part of the interface
         * the user will face with and this is good place to save the user
         * in the database for a future work.
         */

        await db.getUserByTelegramId(ctx.from.id)

        const keyboard = new InlineKeyboard()

        keyboard
            .add({ text: 'Начать сессию', callback_data: 'start_session' })
            .row()
            .add({ text: 'Открыть статистику', callback_data: 'show_stats' })

        await ctx.reply(messageText, { reply_markup: keyboard, parse_mode: 'HTML' })

        log('sent')
    }
}
