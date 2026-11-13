import { Router } from 'express'
import { getEmployeeByIdentifier, getEmployees } from '../controllers/employee.controller.js'

export const employeeRouter = Router()

employeeRouter.get('/', getEmployees)
employeeRouter.get('/:id', getEmployeeByIdentifier)
