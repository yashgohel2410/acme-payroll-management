import type { Server } from 'node:http'
import { createApp } from './app.js'
import { disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'

const app = createApp()

const server: Server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`)
})

let isShuttingDown = false

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.log(`Received ${signal}, shutting down`)

  server.close((closeError) => {
    void disconnectDatabase()
      .catch((disconnectError: unknown) => {
        console.error('Failed to disconnect the database', disconnectError)
      })
      .finally(() => {
        if (closeError) {
          console.error('Failed to close the server', closeError)
          process.exit(1)
        }

        process.exit(0)
      })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
