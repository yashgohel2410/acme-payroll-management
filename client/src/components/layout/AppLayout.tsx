import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'
import { TopNav } from './TopNav.tsx'

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function closeSidebar() {
    setIsSidebarOpen(false)
  }

  function toggleSidebar() {
    setIsSidebarOpen((open) => !open)
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />
      {isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      ) : null}
      <div className="app-shell__main">
        <TopNav isSidebarOpen={isSidebarOpen} onMenuToggle={toggleSidebar} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
