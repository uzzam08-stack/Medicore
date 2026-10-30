import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  CalendarDays, 
  Activity, 
  ShieldCheck, 
  Database 
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab, isOnline }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Activity size={22} className="text-brand-primary" />
        </div>
        <div className="brand-text">
          <span className="brand-name">MediCore</span>
          <span className="brand-subtitle">Clinical Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">MAIN NAVIGATION</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={19} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="nav-active-pill" />}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="sidebar-footer">
        <div className="system-status-card">
          <div className="status-header">
            <Database size={15} />
            <span>SQLite Persistence</span>
          </div>
          <div className="status-indicator-row">
            <span className={`status-pill ${isOnline ? 'pill-online' : 'pill-offline'}`}>
              <span className="status-ping" />
              {isOnline ? 'API Connected' : 'Connecting...'}
            </span>
            <span className="text-xs text-muted">v1.0.0</span>
          </div>
        </div>

        <div className="arch-badge">
          <ShieldCheck size={13} />
          <span>OOP Python REST Engine</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
