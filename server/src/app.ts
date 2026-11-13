import cors from 'cors'
import express, { type Express } from 'express'
import { errorHandler } from './middleware/error.middleware.js'
import { notFoundHandler } from './middleware/notFound.middleware.js'
import { registerRoutes } from './routes/index.js'

export function createApp(): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())
  registerRoutes(app)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
