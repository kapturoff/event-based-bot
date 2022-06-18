// Loads .env file

import { config } from 'dotenv'
config()

const { WEBHOOK_URL, PORT, DATABASE_PATH, BOT_TOKEN } = process.env

import runServer from './server'
import buildBot from './bot'
import DatabaseAdapter from './helpers/DatabaseAdapter'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import EventEmitter from 'events'

async function main(
    port: number,
    databasePath: string,
    botToken: string,
    webhookUrl?: string
) {
    // Creating new database connection and wrap it with high-level methods

    const db = new DatabaseAdapter(
        await open({ filename: databasePath, driver: sqlite3.Database })
    )

    // Establishing database schema

    await db.establishSchema()

    // Creates new emitter for the event-based part of the bot

    const emitter = new EventEmitter()

    // Creating the bot

    const bot = buildBot(botToken, emitter, db)

    // Runs fastify server that will listen for webhooks

    runServer(port, db, bot, webhookUrl)
}

main(Number(PORT), DATABASE_PATH, BOT_TOKEN, WEBHOOK_URL)
