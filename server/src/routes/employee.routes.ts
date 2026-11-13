import { Router } from 'express'
import {
  deleteEmployee,
  getEmployeeByIdentifier,
  getEmployeeSalaryHistoryByIdentifier,
  getEmployees,
  postEmployee,
  postEmployeeSalary,
  putEmployee,
} from '../controllers/employee.controller.js'

export const employeeRouter = Router()

employeeRouter.get('/', getEmployees)
employeeRouter.post('/', postEmployee)
employeeRouter.get('/:id/salary-history', getEmployeeSalaryHistoryByIdentifier)
employeeRouter.post('/:id/salary', postEmployeeSalary)
employeeRouter.get('/:id', getEmployeeByIdentifier)
employeeRouter.put('/:id', putEmployee)
employeeRouter.delete('/:id', deleteEmployee)
