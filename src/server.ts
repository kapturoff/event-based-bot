import { Bot, webhookCallback } from 'grammy'
import DatabaseAdapter from './helpers/DatabaseAdapter'
import localtunnel from 'localtunnel'
import Fastify from 'fastify'

const log = (...args: any[]) => console.log('\x1b[32m', '[server]', ...args, '\x1b[0m')

export default async function runServer(
    port: number,
    db: DatabaseAdapter,
    bot: Bot,
    webhookUrl?: string
) {
    /**
     * If we're on localhost and need tunnel to work with webhooks, we use Localtunnel.
     * Otherwise, we use a provided webhook URL.
     *
     * Adding a slash in the end is mandatory for compability!
     */
    const botUrl = webhookUrl || (await localtunnel(port)).url + '/'

    const app = Fastify()

    app.post('/', (req, res) => {
        log('request has been catched')

        webhookCallback(bot, 'fastify')(req, res).catch((e) =>
            log('error occured during handling webhook', e)
        )
    })

    await app.listen({ port })

    log('started. setting webhooks...')

    await bot.api.setWebhook(botUrl)

    log('started to listen for webhooks on ' + botUrl)
}
