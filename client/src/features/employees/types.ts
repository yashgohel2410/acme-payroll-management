export const employmentStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const

export type EmploymentStatus = (typeof employmentStatuses)[number]

export const employeeSortFields = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'dateOfJoining',
  'designation',
  'employmentStatus',
] as const

export type EmployeeSortField = (typeof employeeSortFields)[number]

export type EmployeeSortOrder = 'asc' | 'desc'

export type EmployeeCurrency = {
  id: number
  code: string
  name: string
  minorUnitDigits: number
}

export type ListedEmployee = {
  id: number
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  dateOfJoining: string
  designation: string
  employmentStatus: EmploymentStatus
  country: {
    id: number
    name: string
    isoCode: string
  }
  department: {
    id: number
    name: string
  }
  currentSalary: {
    amount: number
    currency: EmployeeCurrency
  } | null
}

export type EmployeeListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type EmployeeListResult = {
  data: ListedEmployee[]
  meta: EmployeeListMeta
}

export type EmployeeListParams = {
  page: number
  limit: number
  search?: string
  departmentId?: number
  countryId?: number
  employmentStatus?: EmploymentStatus
  sortBy: EmployeeSortField
  sortOrder: EmployeeSortOrder
}

export type NamedOption = {
  id: number
  name: string
  detail?: string
}

export type EmployeeSalary = {
  id: number
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
  currency: EmployeeCurrency
}

export type EmployeeDetails = Omit<ListedEmployee, 'currentSalary'> & {
  currentSalary: EmployeeSalary | null
  salaryHistory: EmployeeSalary[]
}

export type CreateEmployeePayload = {
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  designation: string
  dateOfJoining: string
  employmentStatus: EmploymentStatus
  departmentId: number
  countryId: number
  amount: number
  currencyId: number
  effectiveFrom: string
}

export type UpdateEmployeePayload = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  designation: string
  departmentId: number
  countryId: number
  employmentStatus: EmploymentStatus
}

export type EmployeeEditValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  designation: string
  departmentId: number | null
  countryId: number | null
  employmentStatus: EmploymentStatus
}

export type EmployeeFormValues = {
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  designation: string
  dateOfJoining: string
  departmentId: number | null
  countryId: number | null
  amount: string
  currencyId: number | null
  effectiveFrom: string
}

export type EmployeeCatalogOptions = {
  departments: NamedOption[]
  countries: NamedOption[]
  currencies: EmployeeCurrency[]
}

export type EmployeeReferenceOptions = EmployeeCatalogOptions & {
  nextEmployeeCode: string
}
