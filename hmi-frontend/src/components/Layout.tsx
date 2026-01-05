import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const Layout: React.FC = () => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Sidebar />
      </aside>
      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
