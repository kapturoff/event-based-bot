import EventEmitter from 'events'
import DatabaseAdapter from './DatabaseAdapter'

const log = (...args: any[]) => console.debug('[emitter_services]', ...args)

import mainPage from '../listeners/MainPage'
import { startSession, endSession } from '../listeners/Session'

export const EVENT_LISTENER_PAIRS = {
    main_page: mainPage,
    start_session: startSession,
    end_session: endSession,
}

type EventName = keyof typeof EVENT_LISTENER_PAIRS

export function registerListeners(emitter: EventEmitter, db: DatabaseAdapter) {
    for (let key in EVENT_LISTENER_PAIRS) {
        emitter.on(key, EVENT_LISTENER_PAIRS[key as EventName](emitter, db))
    }
}
