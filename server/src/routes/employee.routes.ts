import { Router } from 'express'
import {
  deleteEmployee,
  getEmployeeByIdentifier,
  getEmployees,
  postEmployee,
  putEmployee,
} from '../controllers/employee.controller.js'

export const employeeRouter = Router()

employeeRouter.get('/', getEmployees)
employeeRouter.post('/', postEmployee)
employeeRouter.get('/:id', getEmployeeByIdentifier)
employeeRouter.put('/:id', putEmployee)
employeeRouter.delete('/:id', deleteEmployee)
