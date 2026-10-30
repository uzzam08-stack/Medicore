import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Stethoscope, 
  CalendarCheck, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle,
  CalendarDays
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatTime, getStatusBadgeConfig } from '../utils/formatters';

const STATUS_COLORS = {
  SCHEDULED: '#0284c7',
  RESCHEDULED: '#9333ea',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

export function Dashboard({ 
  onNavigate, 
  onSelectPatient, 
  onSelectAppointment, 
  onOpenBookModal,
  onOpenRescheduleModal,
  onOpenCancelDialog,
  onCompleteAppointment 
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <RefreshCw className="spin-icon text-brand-primary" size={32} />
          <p>Loading clinical dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <AlertCircle size={36} className="text-danger" />
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={fetchStats}>
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data from authentic backend numbers
  const pieData = Object.entries(stats.status_counts || {})
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase(),
      value: count,
      color: STATUS_COLORS[status] || '#64748b',
    }));

  const barData = (stats.specialization_counts || []).map((item) => ({
    specialization: item.specialization,
    count: item.count,
  }));

  return (
    <div className="page-container animate-fade-in">
      {/* Top Metric Cards */}
      <div className="stats-grid">
        <div 
          className="stat-card cursor-pointer hover-lift"
          onClick={() => onNavigate('patients')}
          role="button"
          tabIndex={0}
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Total Patients</span>
            <div className="stat-icon-wrapper icon-blue">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total_patients}</div>
          <div className="stat-card-footer text-muted">
            <span>Verified patient records</span>
            <ArrowRight size={14} className="stat-arrow" />
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover-lift"
          onClick={() => onNavigate('doctors')}
          role="button"
          tabIndex={0}
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Total Doctors</span>
            <div className="stat-icon-wrapper icon-emerald">
              <Stethoscope size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total_doctors}</div>
          <div className="stat-card-footer text-muted">
            <span className="text-emerald font-medium">{stats.available_doctors} Available</span>
            <ArrowRight size={14} className="stat-arrow" />
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover-lift"
          onClick={() => onNavigate('appointments')}
          role="button"
          tabIndex={0}
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Today's Appointments</span>
            <div className="stat-icon-wrapper icon-purple">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.todays_appointments}</div>
          <div className="stat-card-footer text-muted">
            <span>Scheduled for today</span>
            <ArrowRight size={14} className="stat-arrow" />
          </div>
        </div>

        <div 
          className="stat-card cursor-pointer hover-lift"
          onClick={() => onNavigate('appointments')}
          role="button"
          tabIndex={0}
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Upcoming Active</span>
            <div className="stat-icon-wrapper icon-amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {(stats.status_counts.SCHEDULED || 0) + (stats.status_counts.RESCHEDULED || 0)}
          </div>
          <div className="stat-card-footer text-muted">
            <span>Active appointments</span>
            <ArrowRight size={14} className="stat-arrow" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="dashboard-charts-grid">
        {/* Appointment Status Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Appointments by Status</h3>
              <p className="chart-card-subtitle">Distribution across all historical & active bookings</p>
            </div>
            <Activity size={18} className="text-muted" />
          </div>

          <div className="chart-wrapper">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                      border: '1px solid #e2e8f0',
                      fontSize: '12px' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No appointment status data yet</div>
            )}
          </div>

          <div className="chart-legend">
            {Object.entries(stats.status_counts || {}).map(([status, count]) => {
              const cfg = getStatusBadgeConfig(status);
              return (
                <div key={status} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: cfg.color }} />
                  <span className="legend-name">{cfg.label}:</span>
                  <span className="legend-val">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor Specialization Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Doctor Specializations</h3>
              <p className="chart-card-subtitle">Active medical staff distribution</p>
            </div>
            <Stethoscope size={18} className="text-muted" />
          </div>

          <div className="chart-wrapper">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="specialization" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                      border: '1px solid #e2e8f0',
                      fontSize: '12px' 
                    }} 
                  />
                  <Bar dataKey="count" name="Doctors" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No doctors registered yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Tables & Activity Row */}
      <div className="dashboard-content-grid">
        {/* Today's Schedule Table */}
        <div className="panel-card col-span-2">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Today's Appointment Schedule</h3>
              <p className="panel-subtitle">Immediate patient arrivals and pending consultations</p>
            </div>
            <button
              type="button"
              className="btn-outline-sm"
              onClick={onOpenBookModal}
            >
              + Book New
            </button>
          </div>

          {stats.today_schedule && stats.today_schedule.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.today_schedule.map((appt) => (
                    <tr key={appt.id} className="hover-row">
                      <td className="font-semibold text-brand-dark">
                        {formatTime(appt.appointment_date)}
                      </td>
                      <td>
                        <span className="font-medium text-slate-900">{appt.patient_name}</span>
                      </td>
                      <td>
                        <span className="text-slate-800">Dr. {appt.doctor_name}</span>
                        <span className="block text-xs text-muted">{appt.doctor_specialization}</span>
                      </td>
                      <td className="text-sm text-slate-600 max-w-xs truncate">
                        {appt.reason || 'General Consultation'}
                      </td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="text-right">
                        <div className="table-action-group">
                          {appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                            <>
                              <button
                                type="button"
                                className="action-btn text-emerald"
                                title="Mark Completed"
                                onClick={() => onCompleteAppointment(appt.id)}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn text-purple"
                                title="Reschedule"
                                onClick={() => onOpenRescheduleModal(appt)}
                              >
                                <CalendarDays size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn text-rose"
                                title="Cancel"
                                onClick={() => onOpenCancelDialog(appt)}
                              >
                                <AlertCircle size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn-outline-xs"
                            onClick={() => onSelectAppointment(appt.id)}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-empty-state">
              <CalendarCheck size={36} className="text-slate-300 mb-2" />
              <p className="font-medium text-slate-700">No appointments scheduled for today</p>
              <p className="text-xs text-slate-500 mb-3">All scheduled slots for today are open or concluded.</p>
              <button 
                type="button" 
                className="btn-primary-sm"
                onClick={onOpenBookModal}
              >
                Book An Appointment
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Appointments List */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Upcoming Consultations</h3>
              <p className="panel-subtitle">Next future active bookings</p>
            </div>
            <button
              type="button"
              className="text-xs text-brand-primary font-medium hover:underline"
              onClick={() => onNavigate('appointments')}
            >
              View all
            </button>
          </div>

          <div className="upcoming-list">
            {stats.upcoming_appointments && stats.upcoming_appointments.length > 0 ? (
              stats.upcoming_appointments.map((appt) => (
                <div 
                  key={appt.id} 
                  className="upcoming-item cursor-pointer"
                  onClick={() => onSelectAppointment(appt.id)}
                >
                  <div className="upcoming-date-box">
                    <span className="upcoming-month">
                      {new Date(appt.appointment_date).toLocaleDateString([], { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="upcoming-day">
                      {new Date(appt.appointment_date).getDate()}
                    </span>
                  </div>
                  <div className="upcoming-info">
                    <span className="upcoming-patient">{appt.patient_name}</span>
                    <span className="upcoming-doctor">
                      Dr. {appt.doctor_name} • {appt.doctor_specialization}
                    </span>
                    <span className="upcoming-time text-xs text-muted">
                      {formatTime(appt.appointment_date)} ({appt.duration_minutes || 30} mins)
                    </span>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))
            ) : (
              <div className="panel-empty-state py-8">
                <Clock size={32} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-600">No future upcoming appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit Activity Feed */}
        <div className="panel-card col-span-3">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">System Audit & Activity Trail</h3>
              <p className="panel-subtitle">Transparent record modifications captured by DatabaseManager</p>
            </div>
            <span className="text-xs text-muted">Live SQLite stream</span>
          </div>

          <div className="audit-feed">
            {stats.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((entry) => (
                <div key={entry.id} className="audit-row">
                  <div className="audit-badge-col">
                    <span className={`audit-tag audit-${entry.action.toLowerCase()}`}>
                      {entry.action}
                    </span>
                  </div>
                  <div className="audit-entity-col">
                    <span className="font-semibold text-slate-800">{entry.entity_type}</span>
                    {entry.entity_id && (
                      <span className="text-xs text-muted ml-1">#{entry.entity_id}</span>
                    )}
                  </div>
                  <div className="audit-details-col">
                    <span className="text-sm text-slate-600">{entry.details}</span>
                  </div>
                  <div className="audit-time-col">
                    <span className="text-xs text-slate-400">
                      {formatDateTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No audit logs recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
