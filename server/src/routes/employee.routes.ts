import { Router } from 'express'
import { getEmployees } from '../controllers/employee.controller.js'

export const employeeRouter = Router()

employeeRouter.get('/', getEmployees)
