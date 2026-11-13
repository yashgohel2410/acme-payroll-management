import { Button } from 'primereact/button'
import { useLocation } from 'react-router-dom'
import { resolvePageTitle } from './navigation.ts'

type TopNavProps = {
  isSidebarOpen: boolean
  onMenuToggle: () => void
}

export function TopNav({ isSidebarOpen, onMenuToggle }: TopNavProps) {
  const { pathname } = useLocation()
  const title = resolvePageTitle(pathname)

  return (
    <header className="topnav">
      <Button
        type="button"
        className="topnav__menu"
        aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
        onClick={onMenuToggle}
      >
        <i className={isSidebarOpen ? 'pi pi-times' : 'pi pi-bars'} aria-hidden="true" />
      </Button>
      <div className="topnav__title">
        <p className="topnav__eyebrow">ACME Payroll Management</p>
        <p className="topnav__page">{title}</p>
      </div>
      <p className="topnav__persona">HR Manager</p>
    </header>
  )
}
