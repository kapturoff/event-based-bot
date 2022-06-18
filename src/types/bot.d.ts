import { Context as BaseContext, Bot, SessionFlavor } from 'grammy'
import { User } from './database'

export type Session = { user: User }

export type Context = BaseContext & SessionFlavor<Session>
