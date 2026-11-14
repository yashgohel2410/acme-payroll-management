import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { PlaceholderPage } from '../components/ui/PlaceholderPage.tsx'
import { AnalyticsPage } from '../features/analytics/pages/AnalyticsPage.tsx'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx'
import { EditEmployeePage } from '../features/employees/pages/EditEmployeePage.tsx'
import { EmployeeDetailPage } from '../features/employees/pages/EmployeeDetailPage.tsx'
import { EmployeeListPage } from '../features/employees/pages/EmployeeListPage.tsx'
import { NewEmployeePage } from '../features/employees/pages/NewEmployeePage.tsx'
import { SalariesPage } from '../features/salaries/pages/SalariesPage.tsx'
import { SalaryHistoryPage } from '../features/salaries/pages/SalaryHistoryPage.tsx'
import { routePaths } from './routePaths.ts'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={routePaths.dashboard} replace />} />
        <Route path={routePaths.dashboard} element={<DashboardPage />} />
        <Route path={routePaths.newEmployee} element={<NewEmployeePage />} />
        <Route path={routePaths.employees} element={<EmployeeListPage />} />
        <Route path={routePaths.editEmployee} element={<EditEmployeePage />} />
        <Route path={routePaths.employee} element={<EmployeeDetailPage />} />
        <Route path={routePaths.salaryHistory} element={<SalaryHistoryPage />} />
        <Route path={routePaths.salaries} element={<SalariesPage />} />
        <Route path={routePaths.analytics} element={<AnalyticsPage />} />
        <Route
          path="*"
          element={
            <PlaceholderPage
              title="Page not found"
              description="This address is not part of ACME Payroll Management."
            />
          }
        />
      </Route>
    </Routes>
  )
}
