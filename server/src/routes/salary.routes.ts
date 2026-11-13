import { Router } from 'express'
import { getSalaries } from '../controllers/salary.controller.js'

export const salaryRouter = Router()

salaryRouter.get('/', getSalaries)
