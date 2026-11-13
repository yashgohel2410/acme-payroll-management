import { NavLink } from 'react-router-dom'
import { primaryNavItems } from './navigation.ts'

type SidebarProps = {
  isOpen: boolean
  onNavigate: () => void
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <aside
      id="app-sidebar"
      className={isOpen ? 'sidebar sidebar--open' : 'sidebar'}
    >
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">
          AP
        </span>
        <div>
          <p className="sidebar__product">ACME Payroll</p>
          <p className="sidebar__audience">HR Manager</p>
        </div>
      </div>
      <nav className="sidebar__nav" aria-label="Primary">
        <ul className="sidebar__list">
          {primaryNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
                }
                onClick={onNavigate}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
