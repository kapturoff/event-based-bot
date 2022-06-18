import EventEmitter from 'events'
import DatabaseAdapter from './DatabaseAdapter'

import { mainPage, cannotAccess } from '../listeners/MainPage'
import { startSession, endSession } from '../listeners/Session'
import { Context } from '../types/bot'
import { NextFunction } from 'grammy'

/**
 * _Registers listeners of events that the event emitter emits._
 *
 * ---
 *
 * It takes `emitter` and `db` as arguments because it forwards them
 * inside the listeners to allow them:
 * - to jump to another listeners
 * _(@see listeners/mainPage.ts, where `mainPage` listeners jumps into
 * `cannotAccess` listener)_
 * - to use database _(since we don't have models)_.
 *
 * ---
 *
 * **TODO:** How to forward real props (like different IDs) into listeners?
 * Maybe start using _callbackDataSlicer.ts_ again?
 */
export function registerListeners(emitter: EventEmitter, db: DatabaseAdapter): void {
    const EVENT_LISTENER_PAIRS = {
        main_page: mainPage(emitter, db),
        start_session: startSession(emitter, db),
        end_session: endSession(emitter, db),
        cannot_access: cannotAccess(emitter, db),
        /** This is the way of creating variaty of listeners*/
        continue_session: startSession(emitter, db, { userGettingBackToSession: true }),
    }

    type EventName = keyof typeof EVENT_LISTENER_PAIRS

    for (let key in EVENT_LISTENER_PAIRS) {
        /**
         * Here we don't forward ctx and next objects explicitly,
         * but rather allow to forward all args of an event in a more
         * flexible, but fuzzy way.
         */

        emitter.on(key, EVENT_LISTENER_PAIRS[key as EventName])
    }
}

/**
 * Perhaps, this is going to be the most awful function of the entire
 * bot.
 */
export function convertTextMessagesIntoEvents(
    ctx: Context,
    next: NextFunction,
    emitter: EventEmitter,
    db: DatabaseAdapter
) {
    console.log(ctx.session)
    if (ctx.session.user?.isOnSession) emitter.emit('cannot_access', { ctx, next })
}
