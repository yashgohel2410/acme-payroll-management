import axios from 'axios'
import { readApiErrorMessage } from '../../../services/api/apiError.ts'
import { apiClient } from '../../../services/api/httpClient.ts'
import { formatEmployeeCode, readEmployeeSequence } from '../employeeForm.ts'
import type { SalaryRevisionPayload } from '../salaryRevision.ts'
import {
  employmentStatuses,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
  type EmployeeCatalogOptions,
  type EmployeeCurrency,
  type EmployeeDetails,
  type EmployeeListParams,
  type EmployeeListResult,
  type EmployeeReferenceOptions,
  type EmployeeSalary,
  type EmploymentStatus,
  type ListedEmployee,
  type NamedOption,
} from '../types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} response was not an object.`)
  }

  return value
}

function readNumber(record: Record<string, unknown>, field: string, label: string): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} response is missing ${field}.`)
  }

  return value
}

function readString(record: Record<string, unknown>, field: string, label: string): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new Error(`${label} response is missing ${field}.`)
  }

  return value
}

function readNullableString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field]
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Employee response is missing ${field}.`)
  }

  return value
}

export class EmployeeSaveError extends Error {
  readonly fields: Readonly<Record<string, string>>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'EmployeeSaveError'
    this.fields = fields
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(message = 'Employee not found') {
    super(message)
    this.name = 'EmployeeNotFoundError'
  }
}

export class EmployeeAlreadyInactiveError extends Error {
  constructor(message = 'Employee is already inactive') {
    super(message)
    this.name = 'EmployeeAlreadyInactiveError'
  }
}

function isEmploymentStatus(value: string): value is EmploymentStatus {
  return employmentStatuses.some((status) => status === value)
}

function parseCurrencyRecord(record: Record<string, unknown>, label: string): EmployeeSalary['currency'] {
  return {
    id: readNumber(record, 'id', label),
    code: readString(record, 'code', label),
    name: readString(record, 'name', label),
    minorUnitDigits: readNumber(record, 'minorUnitDigits', label),
  }
}

function parseListedSalary(value: unknown): ListedEmployee['currentSalary'] {
  if (value === null || value === undefined) {
    return null
  }

  const salary = readRecord(value, 'Current salary')
  const currency = readRecord(salary.currency, 'Current salary currency')

  return {
    amount: readNumber(salary, 'amount', 'Current salary'),
    currency: parseCurrencyRecord(currency, 'Current salary currency'),
  }
}

function parseSalaryRecord(value: unknown, label: string): EmployeeSalary {
  const salary = readRecord(value, label)
  const currency = readRecord(salary.currency, `${label} currency`)

  return {
    id: readNumber(salary, 'id', label),
    amount: readNumber(salary, 'amount', label),
    effectiveFrom: readString(salary, 'effectiveFrom', label),
    effectiveTo: readNullableString(salary, 'effectiveTo'),
    currency: parseCurrencyRecord(currency, `${label} currency`),
  }
}

function parseEmployee(value: unknown): ListedEmployee {
  const record = readRecord(value, 'Employee')
  const status = readString(record, 'employmentStatus', 'Employee')
  if (!isEmploymentStatus(status)) {
    throw new Error('Employee response has an unknown employment status.')
  }

  const department = readRecord(record.department, 'Employee department')
  const country = readRecord(record.country, 'Employee country')

  return {
    id: readNumber(record, 'id', 'Employee'),
    employeeCode: readString(record, 'employeeCode', 'Employee'),
    firstName: readString(record, 'firstName', 'Employee'),
    lastName: readString(record, 'lastName', 'Employee'),
    email: readString(record, 'email', 'Employee'),
    phone: readNullableString(record, 'phone'),
    dateOfJoining: readString(record, 'dateOfJoining', 'Employee'),
    designation: readString(record, 'designation', 'Employee'),
    employmentStatus: status,
    department: {
      id: readNumber(department, 'id', 'Employee department'),
      name: readString(department, 'name', 'Employee department'),
    },
    country: {
      id: readNumber(country, 'id', 'Employee country'),
      name: readString(country, 'name', 'Employee country'),
      isoCode: readString(country, 'isoCode', 'Employee country'),
    },
    currentSalary: parseListedSalary(record.currentSalary),
  }
}

function parseList(value: unknown): EmployeeListResult {
  const record = readRecord(value, 'Employee list')
  if (!Array.isArray(record.data)) {
    throw new Error('Employee list response is missing data.')
  }

  const meta = readRecord(record.meta, 'Employee list')

  return {
    data: record.data.map((item) => parseEmployee(item)),
    meta: {
      page: readNumber(meta, 'page', 'Employee list'),
      limit: readNumber(meta, 'limit', 'Employee list'),
      total: readNumber(meta, 'total', 'Employee list'),
      totalPages: readNumber(meta, 'totalPages', 'Employee list'),
    },
  }
}

export function readEmployeeError(error: unknown): string {
  return readApiErrorMessage(error, 'Employees could not be loaded.')
}

export async function listEmployees(params: EmployeeListParams): Promise<EmployeeListResult> {
  const response = await apiClient.get<unknown>('/employees', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      departmentId: params.departmentId,
      countryId: params.countryId,
      employmentStatus: params.employmentStatus,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  })

  return parseList(response.data)
}

export async function loadEmployeeFilterOptions(): Promise<{
  departments: NamedOption[]
  countries: NamedOption[]
}> {
  const result = await listEmployees({
    page: 1,
    limit: 100,
    sortBy: 'employeeCode',
    sortOrder: 'asc',
  })

  const departments = new Map<number, NamedOption>()
  const countries = new Map<number, NamedOption>()

  for (const employee of result.data) {
    departments.set(employee.department.id, { id: employee.department.id, name: employee.department.name })
    countries.set(employee.country.id, {
      id: employee.country.id,
      name: employee.country.name,
      detail: employee.country.isoCode,
    })
  }

  return {
    departments: [...departments.values()].sort((left, right) => left.name.localeCompare(right.name)),
    countries: [...countries.values()].sort((left, right) => left.name.localeCompare(right.name)),
  }
}

function parseEmployeeDetails(value: unknown): EmployeeDetails {
  const record = readRecord(value, 'Employee')
  const employee = parseEmployee(record)
  if (!Array.isArray(record.salaryHistory)) {
    throw new Error('Employee response is missing salaryHistory.')
  }

  const salaryHistory = record.salaryHistory
    .map((item) => parseSalaryRecord(item, 'Salary history'))
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom) || right.id - left.id)

  return {
    ...employee,
    currentSalary:
      record.currentSalary === null || record.currentSalary === undefined
        ? null
        : parseSalaryRecord(record.currentSalary, 'Current salary'),
    salaryHistory,
  }
}

export async function getEmployee(identifier: string): Promise<EmployeeDetails> {
  try {
    const response = await apiClient.get<unknown>(`/employees/${encodeURIComponent(identifier)}`)
    const body = readRecord(response.data, 'Employee')
    return parseEmployeeDetails(body.data)
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new EmployeeNotFoundError(readEmployeeError(error))
    }

    throw error
  }
}

function readApiFields(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {}
  }

  const data: unknown = error.response?.data
  if (!isRecord(data) || !isRecord(data.error) || !Array.isArray(data.error.fields)) {
    return {}
  }

  const fields: Record<string, string> = {}
  for (const field of data.error.fields) {
    if (!isRecord(field) || typeof field.field !== 'string' || typeof field.message !== 'string') {
      continue
    }
    if (fields[field.field] === undefined) {
      fields[field.field] = field.message
    }
  }

  return fields
}

function rememberDepartment(
  departments: Map<number, NamedOption>,
  department: { id: number; name: string },
): void {
  departments.set(department.id, { id: department.id, name: department.name })
}

function rememberCountry(
  countries: Map<number, NamedOption>,
  country: { id: number; name: string; isoCode: string },
): void {
  countries.set(country.id, { id: country.id, name: country.name, detail: country.isoCode })
}

function rememberCurrency(currencies: Map<number, EmployeeCurrency>, currency: EmployeeCurrency): void {
  currencies.set(currency.id, currency)
}

function parseSalaryReferences(value: unknown): {
  departments: NamedOption[]
  countries: NamedOption[]
  currencies: EmployeeCurrency[]
} {
  const body = readRecord(value, 'Salary list')
  if (!Array.isArray(body.data)) {
    throw new Error('Salary list response is missing data.')
  }

  const departments = new Map<number, NamedOption>()
  const countries = new Map<number, NamedOption>()
  const currencies = new Map<number, EmployeeCurrency>()

  for (const item of body.data) {
    const salary = readRecord(item, 'Salary')
    const employee = readRecord(salary.employee, 'Salary employee')
    const department = readRecord(employee.department, 'Salary department')
    const country = readRecord(employee.country, 'Salary country')
    const currency = readRecord(salary.currency, 'Salary currency')
    rememberDepartment(departments, {
      id: readNumber(department, 'id', 'Salary department'),
      name: readString(department, 'name', 'Salary department'),
    })
    rememberCountry(countries, {
      id: readNumber(country, 'id', 'Salary country'),
      name: readString(country, 'name', 'Salary country'),
      isoCode: readString(country, 'isoCode', 'Salary country'),
    })
    rememberCurrency(currencies, parseCurrencyRecord(currency, 'Salary currency'))
  }

  return {
    departments: [...departments.values()],
    countries: [...countries.values()],
    currencies: [...currencies.values()],
  }
}

const maxEmployeeSequence = 2_147_483_647

async function employeeCodeExists(code: string): Promise<boolean> {
  try {
    await getEmployee(code)
    return true
  } catch (error: unknown) {
    if (error instanceof EmployeeNotFoundError) {
      return false
    }

    throw error
  }
}

async function highestPrefixedSequence(start: number): Promise<number> {
  const first = start + 1
  if (first > maxEmployeeSequence || !(await employeeCodeExists(formatEmployeeCode(first)))) {
    return start
  }

  let lower = first
  let upper = first
  while (await employeeCodeExists(formatEmployeeCode(upper))) {
    lower = upper
    if (upper >= maxEmployeeSequence) {
      return upper
    }

    const doubled = upper > Math.floor(maxEmployeeSequence / 2) ? maxEmployeeSequence : upper * 2
    if (doubled === upper) {
      return upper
    }

    upper = doubled
  }

  while (lower + 1 < upper) {
    const mid = Math.floor((lower + upper) / 2)
    if (await employeeCodeExists(formatEmployeeCode(mid))) {
      lower = mid
    } else {
      upper = mid
    }
  }

  return lower
}

export async function loadNextEmployeeCode(): Promise<string> {
  const latest = await listEmployees({
    page: 1,
    limit: 100,
    sortBy: 'employeeCode',
    sortOrder: 'desc',
  })

  let highest = 0
  for (const employee of latest.data) {
    const sequence = readEmployeeSequence(employee.employeeCode)
    if (sequence !== null && sequence > highest) {
      highest = sequence
    }
  }

  highest = await highestPrefixedSequence(highest)
  if (highest >= maxEmployeeSequence) {
    throw new Error('No employee codes are left.')
  }

  return formatEmployeeCode(highest + 1)
}

export async function loadEmployeeCatalog(): Promise<EmployeeCatalogOptions> {
  const [employees, salaries] = await Promise.all([
    listEmployees({ page: 1, limit: 100, sortBy: 'employeeCode', sortOrder: 'asc' }),
    apiClient.get<unknown>('/salaries', {
      params: { page: 1, limit: 100, sortBy: 'effectiveFrom', sortOrder: 'asc' },
    }),
  ])
  const salaryReferences = parseSalaryReferences(salaries.data)
  const departments = new Map<number, NamedOption>()
  const countries = new Map<number, NamedOption>()
  const currencies = new Map<number, EmployeeCurrency>()

  for (const employee of employees.data) {
    rememberDepartment(departments, employee.department)
    rememberCountry(countries, employee.country)
    if (employee.currentSalary !== null) {
      rememberCurrency(currencies, employee.currentSalary.currency)
    }
  }

  for (const department of salaryReferences.departments) {
    rememberDepartment(departments, { id: department.id, name: department.name })
  }
  for (const country of salaryReferences.countries) {
    rememberCountry(countries, {
      id: country.id,
      name: country.name,
      isoCode: country.detail ?? '',
    })
  }
  for (const currency of salaryReferences.currencies) {
    rememberCurrency(currencies, currency)
  }

  return {
    departments: [...departments.values()].sort((left, right) => left.name.localeCompare(right.name)),
    countries: [...countries.values()].sort((left, right) => left.name.localeCompare(right.name)),
    currencies: [...currencies.values()].sort((left, right) => left.code.localeCompare(right.code)),
  }
}

export async function loadEmployeeReferenceOptions(): Promise<EmployeeReferenceOptions> {
  const [catalog, nextEmployeeCode] = await Promise.all([loadEmployeeCatalog(), loadNextEmployeeCode()])

  return { ...catalog, nextEmployeeCode }
}

export async function deactivateEmployee(identifier: string): Promise<void> {
  try {
    await apiClient.delete(`/employees/${encodeURIComponent(identifier)}`)
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) {
      throw error
    }

    const fields = readApiFields(error)
    if (error.response?.status === 404) {
      throw new EmployeeNotFoundError(readEmployeeError(error))
    }

    if (error.response?.status === 409 && fields.employmentStatus !== undefined) {
      throw new EmployeeAlreadyInactiveError(readEmployeeError(error))
    }

    throw new EmployeeSaveError(readEmployeeError(error), fields)
  }
}

export async function updateEmployee(identifier: string, payload: UpdateEmployeePayload): Promise<void> {
  try {
    await apiClient.put(`/employees/${encodeURIComponent(identifier)}`, payload)
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) {
      throw error
    }

    const fields = readApiFields(error)
    if (error.response?.status === 404 && Object.keys(fields).length === 0) {
      throw new EmployeeNotFoundError(readEmployeeError(error))
    }

    throw new EmployeeSaveError(readEmployeeError(error), fields)
  }
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<number> {
  try {
    const response = await apiClient.post<unknown>('/employees', payload)
    const body = readRecord(response.data, 'Create employee')
    const employee = readRecord(body.data, 'Create employee')
    return readNumber(employee, 'id', 'Create employee')
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new EmployeeSaveError(readEmployeeError(error), readApiFields(error))
    }

    throw error
  }
}

export async function reviseEmployeeSalary(id: number, payload: SalaryRevisionPayload): Promise<void> {
  try {
    await apiClient.post(`/employees/${id}/salary`, payload)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new EmployeeSaveError(readEmployeeError(error), readApiFields(error))
    }

    throw error
  }
}
