import { Router } from 'express'
import {
  getEmployeeByIdentifier,
  getEmployees,
  postEmployee,
} from '../controllers/employee.controller.js'

export const employeeRouter = Router()

employeeRouter.get('/', getEmployees)
employeeRouter.post('/', postEmployee)
employeeRouter.get('/:id', getEmployeeByIdentifier)
