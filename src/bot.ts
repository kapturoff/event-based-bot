import EventEmitter from 'events'
import DatabaseAdapter from './helpers/DatabaseAdapter'
import { Bot, session } from 'grammy'
import { registerListeners, convertTextMessagesIntoEvents } from './helpers/emitterServices'
import { Context } from './types/bot'

const log = (...args: any[]) => console.log('\x1b[31m', '[bot]', ...args, '\x1b[0m')

export default function buildBot(token: string, emitter: EventEmitter, db: DatabaseAdapter) {
    const bot = new Bot<Context>(token)

    bot.use(async (ctx, next) => {
        if (ctx.chat.type !== 'private') return

        await next()
    })

    bot.use(session({ initial: () => ({ user: undefined }) }))

    bot.use(async (ctx, next) => {
        const [user] = await db.getUserByTelegramId(ctx.from.id)
        ctx.session.user = user

        await next()
    })

    bot.on('callback_query:data', async (ctx, next) => {
        const key = ctx.callbackQuery.data

        log(`callback query data (${key}) has been catched, serving...`)

        emitter.emit(key, { ctx, next })
    })

    registerListeners(emitter, db)

    bot.on('message:text', async (ctx, next) => {
        convertTextMessagesIntoEvents(ctx, next, emitter, db)

        await next()
    })

    bot.command('start', async (ctx, next) => {
        log('start command has been catched')

        emitter.emit('main_page', { ctx, next })
    })

    return bot
}
