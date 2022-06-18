import EventEmitter from 'events'
import DatabaseAdapter from './helpers/DatabaseAdapter'
import { Bot } from 'grammy'
import { registerListeners } from './helpers/emitterServices'

const log = (...args: any[]) => console.log('\x1b[31m', '[bot]', ...args, '\x1b[0m')

export default function buildBot(token: string, emitter: EventEmitter, db: DatabaseAdapter) {
    const bot = new Bot(token)

    bot.use(async (ctx, next) => {
        if (ctx.chat.type !== 'private') return

        await next()
    })

    bot.on('callback_query:data', async (ctx, next) => {
        const key = ctx.callbackQuery.data

        log(`callback query data (${key}) has been catched, serving...`)

        emitter.emit(key, { ctx, next })
    })

    registerListeners(emitter, db)

    bot.command('start', async (ctx, next) => {
        log('start command has been catched')

        emitter.emit('main_page', { ctx, next })
    })

    return bot
}
