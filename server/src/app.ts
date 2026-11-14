import cors, { type CorsOptions } from 'cors'
import express, { type Express } from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error.middleware.js'
import { notFoundHandler } from './middleware/notFound.middleware.js'
import { registerRoutes } from './routes/index.js'

export const jsonBodyLimit = '32kb'

function allowedOrigins(): readonly string[] {
  const configured = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

  if (configured.length > 0) {
    return configured
  }

  if (env.NODE_ENV === 'production') {
    return []
  }

  return ['http://localhost:5173']
}

function corsOptions(): CorsOptions {
  const origins = allowedOrigins()

  return {
    origin(origin, callback) {
      if (origin === undefined || origins.includes('*') || origins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
  }
}

export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors(corsOptions()))
  app.use(express.json({ limit: jsonBodyLimit }))
  registerRoutes(app)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
