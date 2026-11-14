import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SalariesPage } from './SalariesPage.tsx'

vi.mock('../services/salaryApi.ts', () => ({
  listSalaries: vi.fn(),
  readSalaryError: (error: unknown) => (error instanceof Error ? error.message : 'Salaries could not be loaded.'),
}))

vi.mock('../../employees/services/employeeApi.ts', () => ({
  loadEmployeeCatalog: vi.fn().mockResolvedValue({
    departments: [],
    countries: [],
    currencies: [],
    nextEmployeeCode: 'EMP-1',
  }),
}))

import { listSalaries } from '../services/salaryApi.ts'

const listSalariesMock = vi.mocked(listSalaries)

describe('Salaries page', () => {
  beforeEach(() => {
    listSalariesMock.mockReset()
  })

  it('shows a loading indicator while salaries are requested', () => {
    listSalariesMock.mockReturnValue(new Promise(() => undefined))

    render(
      <MemoryRouter>
        <SalariesPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status', { name: 'Loading salaries' })).toBeInTheDocument()
  })

  it('shows an empty state when no salaries are returned', async () => {
    listSalariesMock.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalRecords: 0, totalPages: 0 },
    })

    render(
      <MemoryRouter>
        <SalariesPage />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('No salary records are available.')).length).toBeGreaterThan(0)
  })

  it('shows the API error and retries', async () => {
    listSalariesMock.mockRejectedValueOnce(new Error('The payroll service is unavailable. Check your connection and try again.'))
    listSalariesMock.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, totalRecords: 0, totalPages: 0 },
    })

    render(
      <MemoryRouter>
        <SalariesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('payroll service is unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect((await screen.findAllByText('No salary records are available.')).length).toBeGreaterThan(0)
    expect(listSalariesMock).toHaveBeenCalledTimes(2)
  })
})
