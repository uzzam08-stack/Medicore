import React, { useState, useEffect } from 'react';
import { CalendarPlus, UserPlus, Clock, Menu } from 'lucide-react';

export function Navbar({ currentTab, onOpenBookModal, onOpenNewPatientModal, onToggleMobileMenu }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Executive Clinical Dashboard';
      case 'patients':
        return 'Patient Directory & Health Records';
      case 'patient-detail':
        return 'Patient Profile & Medical History';
      case 'doctors':
        return 'Physician & Specialist Staff Directory';
      case 'appointments':
        return 'Appointment Schedule & Calendar Manager';
      case 'appointment-detail':
        return 'Appointment Case File';
      default:
        return 'MediCore Portal';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <Menu size={22} />
        </button>
        <div className="page-heading">
          <h1 className="page-title">{getPageTitle()}</h1>
          <span className="page-breadcrumb">MediCore &gt; {currentTab.replace('-', ' ')}</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Live system clock */}
        <div className="live-clock">
          <Clock size={16} className="text-muted" />
          <span className="clock-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="clock-date">
            {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="quick-actions">
          <button
            type="button"
            className="btn-quick-patient"
            onClick={onOpenNewPatientModal}
          >
            <UserPlus size={16} />
            <span>Add Patient</span>
          </button>
          <button
            type="button"
            className="btn-quick-appointment"
            onClick={onOpenBookModal}
          >
            <CalendarPlus size={16} />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
