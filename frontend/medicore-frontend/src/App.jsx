import React, { useMemo, useState } from 'react';
import {
  Activity, CalendarDays, Check, ChevronDown, ChevronRight, Clock3,
  HeartPulse, LayoutDashboard, Menu, Plus, Search, Settings,
  ShieldCheck, Stethoscope, Users, X, Bell, ArrowUpRight,
  MoreHorizontal, Sparkles, ClipboardList, CalendarCheck,
  UserPlus, RotateCcw, AlertCircle
} from 'lucide-react';
import { createPatient } from './api';

const seedPatients = [
  {
    id: 'PT-1001',
    name: 'Olivia Martin',
    age: 29,
    gender: 'Female',
    phone: '+91 98765 43210',
    email: 'olivia.m@example.com',
    bloodGroup: 'O+',
    address: '12 Park Avenue, Metro City',
    medicalHistory: 'Routine checkup, no chronic conditions',
    note: 'Routine checkup',
    initials: 'OM',
    color: 'rose'
  },
  {
    id: 'PT-1002',
    name: 'Ethan Walker',
    age: 42,
    gender: 'Male',
    phone: '+91 98765 12340',
    email: 'ethan.w@example.com',
    bloodGroup: 'A+',
    address: '45 Green Road, Metro City',
    medicalHistory: 'Mild hypertension, annual follow-up',
    note: 'Follow-up',
    initials: 'EW',
    color: 'blue'
  },
  {
    id: 'PT-1003',
    name: 'Sophia Chen',
    age: 34,
    gender: 'Female',
    phone: '+91 91234 56780',
    email: 'sophia.c@example.com',
    bloodGroup: 'B+',
    address: '78 Lake View, Metro City',
    medicalHistory: 'Asthma managed with inhaler',
    note: "Women's health",
    initials: 'SC',
    color: 'green'
  },
  {
    id: 'PT-1004',
    name: 'Noah Williams',
    age: 51,
    gender: 'Male',
    phone: '+91 99887 66554',
    email: 'noah.w@example.com',
    bloodGroup: 'AB-',
    address: '90 Hillcrest Lane, Metro City',
    medicalHistory: 'Cardiology review, post-stent recovery',
    note: 'Cardiology',
    initials: 'NW',
    color: 'amber'
  }
];

const doctors = [
  { id: 'DR-201', name: 'Dr. Samira Habib', specialty: 'Gynecology', experience: '12 years', status: 'Available', initials: 'SH', color: 'rose' },
  { id: 'DR-202', name: 'Dr. Aryan Patel', specialty: 'Obstetrics', experience: '15 years', status: 'Available', initials: 'AP', color: 'blue' },
  { id: 'DR-203', name: 'Dr. Yukta Rao', specialty: 'Fertility Care', experience: '10 years', status: 'In consultation', initials: 'YR', color: 'green' }
];

const seedAppointments = [
  { id: 'APT-001', patient: 'Olivia Martin', patientId: 'PT-1001', doctor: 'Dr. Samira Habib', doctorId: 'DR-201', date: 'Today', time: '09:30 AM', type: 'Routine checkup', status: 'Confirmed', initials: 'OM', color: 'rose' },
  { id: 'APT-002', patient: 'Ethan Walker', patientId: 'PT-1002', doctor: 'Dr. Aryan Patel', doctorId: 'DR-202', date: 'Today', time: '10:15 AM', type: 'Follow-up', status: 'Waiting', initials: 'EW', color: 'blue' },
  { id: 'APT-003', patient: 'Sophia Chen', patientId: 'PT-1003', doctor: 'Dr. Yukta Rao', doctorId: 'DR-203', date: 'Today', time: '11:00 AM', type: 'Consultation', status: 'Confirmed', initials: 'SC', color: 'green' },
  { id: 'APT-004', patient: 'Noah Williams', patientId: 'PT-1004', doctor: 'Dr. Samira Habib', doctorId: 'DR-201', date: 'Tomorrow', time: '02:30 PM', type: 'Cardiology review', status: 'Confirmed', initials: 'NW', color: 'amber' }
];

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Patients', icon: Users },
  { label: 'Doctors', icon: Stethoscope },
  { label: 'Appointments', icon: CalendarDays }
];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><HeartPulse size={22} /></div>
      <div><b>MediCore</b><span>CARE, MADE SIMPLER</span></div>
    </div>
  );
}

function Avatar({ initials, color = 'purple', large = false }) {
  return <div className={`avatar ${color} ${large ? 'large' : ''}`}>{initials}</div>;
}

function Status({ children }) {
  return <span className={`status ${String(children).toLowerCase().replaceAll(' ', '-')}`}><i />{children}</span>;
}

function Heading({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function getNextPatientId(patientList = []) {
  let maxNum = 1000;
  for (const p of patientList) {
    if (p && p.id) {
      const match = String(p.id).match(/^PT-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `PT-${maxNum + 1}`;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = ['purple', 'rose', 'blue', 'green', 'amber'];
function getAvatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function validatePatientField(field, value) {
  switch (field) {
    case 'name':
      if (!value || !value.trim()) return 'Full name is required';
      if (value.trim().length < 2) return 'Full name must be at least 2 characters';
      if (!/^[a-zA-Z\s.'-]+$/.test(value.trim())) return 'Name should contain letters and standard punctuation';
      return '';
    case 'age':
      if (value === '' || value === null || value === undefined) return 'Age is required';
      const numAge = Number(value);
      if (isNaN(numAge) || !Number.isInteger(numAge)) return 'Age must be a valid whole number';
      if (numAge < 0 || numAge > 130) return 'Age must be between 0 and 130';
      return '';
    case 'gender':
      if (!value) return 'Please select a gender';
      return '';
    case 'phone':
      if (!value || !value.trim()) return 'Phone number is required';
      const digits = value.replace(/[\s\-()+]/g, '');
      if (digits.length < 7 || digits.length > 15 || !/^\d+$/.test(digits)) {
        return 'Enter a valid phone number (7 to 15 digits)';
      }
      return '';
    case 'email':
      if (value && value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(value.trim())) {
          return 'Enter a valid email address (e.g. user@example.com)';
        }
      }
      return '';
    default:
      return '';
  }
}

function PatientRegistrationModal({ isOpen, onClose, onRegister, existingPatients }) {
  const autoId = useMemo(() => getNextPatientId(existingPatients), [existingPatients, isOpen]);

  const initialFormState = {
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    bloodGroup: '',
    address: '',
    medicalHistory: ''
  };

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const err = validatePatientField(name, value);
      setErrors(prev => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validatePatientField(name, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleReset = () => {
    setForm(initialFormState);
    setErrors({});
    setTouched({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    ['name', 'age', 'gender', 'phone', 'email'].forEach(f => {
      const err = validatePatientField(f, form[f]);
      if (err) newErrors[f] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ name: true, age: true, gender: true, phone: true, email: true });
      return;
    }

    const name = form.name.trim();
    const initials = getInitials(name);
    const color = getAvatarColor(name);

    const newPatient = {
      id: autoId,
      name,
      age: parseInt(form.age, 10),
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      bloodGroup: form.bloodGroup || undefined,
      address: form.address.trim() || undefined,
      medicalHistory: form.medicalHistory.trim() || undefined,
      note: form.medicalHistory.trim() ? form.medicalHistory.trim().slice(0, 35) : 'Registered patient',
      initials,
      color
    };

    onRegister(newPatient);
    onClose();
  };

  return (
    <Modal title="Register New Patient" subtitle="Create a comprehensive patient record." onClose={onClose} wide={true}>
      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          <span>Patient ID <span className="form-hint">(Assigned)</span></span>
          <input value={autoId} readOnly className="id-readonly" tabIndex={-1} aria-label="Assigned Patient ID" />
        </label>

        <label>
          <span>Full Name <span className="req-star">*</span></span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. Eleanor Vance"
            className={touched.name && errors.name ? 'input-error' : ''}
            required
            autoFocus
          />
          {touched.name && errors.name && (
            <span className="form-error"><AlertCircle size={12} />{errors.name}</span>
          )}
        </label>

        <label>
          <span>Age <span className="req-star">*</span></span>
          <input
            name="age"
            type="number"
            min="0"
            max="130"
            value={form.age}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 32"
            className={touched.age && errors.age ? 'input-error' : ''}
            required
          />
          {touched.age && errors.age && (
            <span className="form-error"><AlertCircle size={12} />{errors.age}</span>
          )}
        </label>

        <label>
          <span>Gender <span className="req-star">*</span></span>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            onBlur={handleBlur}
            className={touched.gender && errors.gender ? 'input-error' : ''}
            required
          >
            <option value="" disabled>Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {touched.gender && errors.gender && (
            <span className="form-error"><AlertCircle size={12} />{errors.gender}</span>
          )}
        </label>

        <label>
          <span>Phone Number <span className="req-star">*</span></span>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. +91 98765 43210"
            className={touched.phone && errors.phone ? 'input-error' : ''}
            required
          />
          {touched.phone && errors.phone && (
            <span className="form-error"><AlertCircle size={12} />{errors.phone}</span>
          )}
        </label>

        <label>
          <span>Email Address <span className="form-hint">(Optional)</span></span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. eleanor@example.com"
            className={touched.email && errors.email ? 'input-error' : ''}
          />
          {touched.email && errors.email && (
            <span className="form-error"><AlertCircle size={12} />{errors.email}</span>
          )}
        </label>

        <label className="full">
          <span>Blood Group <span className="form-hint">(Optional)</span></span>
          <select
            name="bloodGroup"
            value={form.bloodGroup}
            onChange={handleChange}
          >
            <option value="">Select blood group (optional)</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </label>

        <label className="full">
          <span>Address <span className="form-hint">(Optional)</span></span>
          <textarea
            name="address"
            rows="2"
            value={form.address}
            onChange={handleChange}
            placeholder="Street address, apartment, city, state"
          />
        </label>

        <label className="full">
          <span>Medical History / Pre-existing Conditions <span className="form-hint">(Optional)</span></span>
          <textarea
            name="medicalHistory"
            rows="2"
            value={form.medicalHistory}
            onChange={handleChange}
            placeholder="Allergies, chronic conditions, regular medications, past surgeries"
          />
        </label>

        <div className="form-actions full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '12px' }}>
          <button
            type="button"
            className="button outline"
            onClick={handleReset}
            title="Clear all fields while keeping the form open"
          >
            <RotateCcw size={14} /> Reset Form
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
            >
              <UserPlus size={15} /> Register Patient
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function App() {
  const [page, setPage] = useState('Overview');
  const [patients, setPatients] = useState(seedPatients);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [query, setQuery] = useState('');
  const [patientModal, setPatientModal] = useState(false);
  const [appointmentModal, setAppointmentModal] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');

  const filteredPatients = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(p =>
      `${p.name} ${p.id} ${p.phone} ${p.bloodGroup || ''} ${p.email || ''} ${p.note || ''} ${p.medicalHistory || ''} ${p.address || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [patients, query]);

  function notify(s) {
    setNotice(s);
    setTimeout(() => setNotice(''), 2800);
  }

  function handleRegisterPatient(newPatient) {
    setPatients(prev => [newPatient, ...prev]);
    createPatient(newPatient).catch(() => {});
    notify(`Patient ${newPatient.name} (${newPatient.id}) registered successfully.`);
  }

  function addAppointment(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = patients.find(x => x.id === f.get('patientId'));
    const d = doctors.find(x => x.id === f.get('doctorId'));
    if (!p || !d) return;
    const rawTime = f.get('time');
    const t = formatTime(rawTime);
    const formattedTime = t.period ? `${t.val} ${t.period}` : rawTime;
    setAppointments(prev => [
      {
        id: `APT-${String(prev.length + 1).padStart(3, '0')}`,
        patient: p.name,
        patientId: p.id,
        doctor: d.name,
        doctorId: d.id,
        date: f.get('date'),
        time: formattedTime,
        type: f.get('type'),
        status: 'Confirmed',
        initials: p.initials,
        color: p.color
      },
      ...prev
    ]);
    setAppointmentModal(false);
    notify('Appointment added to this demo session.');
  }

  function cancelAppointment(id) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    notify('Appointment cancelled in this demo.');
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="side-top">
          <Brand />
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}>
            <X size={19} />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(n => (
            <button
              key={n.label}
              className={`nav-item ${page === n.label ? 'active' : ''}`}
              onClick={() => { setPage(n.label); setMobileNav(false); setQuery(''); }}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.label === 'Appointments' && (
                <small>{appointments.filter(a => a.status !== 'Cancelled').length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="divider" />
        <div className="nav-label">PREFERENCES</div>
        <button className="nav-item" onClick={() => notify('Settings will be connected in a later phase.')}>
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <div className="help-card">
          <div className="help-icon"><ShieldCheck size={20} /></div>
          <b>Your care, our priority.</b>
          <p>Keep every detail organized in one place.</p>
          <button onClick={() => notify('Help center is a placeholder for now.')}>
            Visit help center <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="mini-profile">
          <Avatar initials="AD" />
          <div><b>Admin Workspace</b><span>Hospital administrator</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}>
            <Menu size={20} />
          </button>
          <div className="crumb">Workspace <ChevronRight size={14} /><b>{page}</b></div>
          <div className="top-actions">
            <label className="search">
              <Search size={16} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients..." />
            </label>
            <button className="bell" onClick={() => notify("You're all caught up.")}>
              <Bell size={18} /><i />
            </button>
            <div className="user-avatar">
              <Avatar initials="AD" />
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        <div className="content">
          {page === 'Overview' && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-pill"><Sparkles size={13} /> YOUR HEALTHCARE WORKSPACE</div>
                  <h1>Good morning, Admin <span>✦</span></h1>
                  <p>A little more organized. A little more time for care.<br />Here's what's happening at your hospital today.</p>
                  <button className="button white" onClick={() => setPage('Appointments')}>
                    View today's schedule <ChevronRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="orbit o1" />
                  <div className="orbit o2" />
                  <div className="hero-heart"><HeartPulse size={53} /></div>
                  <div className="floating float-one">
                    <CalendarCheck size={19} />
                    <span><b>Care, on time</b><small>Every moment matters</small></span>
                  </div>
                  <div className="floating float-two">
                    <Activity size={19} />
                    <span><b>Patient first</b><small>Always and in every way</small></span>
                  </div>
                </div>
              </section>

              <Heading
                eyebrow="AT A GLANCE"
                title="Your overview"
                description="A quick look at your hospital's activity."
                action={
                  <button className="button primary" onClick={() => setAppointmentModal(true)}>
                    <Plus size={17} /> Book appointment
                  </button>
                }
              />

              <div className="stats">
                <Stat icon={Users} label="Total patients" value={patients.length} note="Registered records" tint="purple" />
                <Stat icon={Stethoscope} label="Medical team" value={doctors.length.toString().padStart(2, '0')} note="Listed doctors" tint="blue" />
                <Stat icon={CalendarDays} label="Appointments" value={appointments.filter(a => a.status !== 'Cancelled').length.toString().padStart(2, '0')} note="Active bookings" tint="pink" />
                <Stat icon={Clock3} label="Awaiting visit" value={appointments.filter(a => a.status === 'Waiting').length.toString().padStart(2, '0')} note="Patients waiting" tint="orange" />
              </div>

              <div className="dashboard-grid">
                <section className="panel">
                  <PanelHead
                    title="Today's appointments"
                    subtitle="Your schedule at a glance"
                    action={<button className="text-link" onClick={() => setPage('Appointments')}>View all <ChevronRight size={15} /></button>}
                  />
                  <div className="appointment-list">
                    {appointments.filter(a => a.date === 'Today' && a.status !== 'Cancelled').map(a => (
                      <AppointmentRow key={a.id} a={a} onCancel={cancelAppointment} />
                    ))}
                    {appointments.every(a => a.date !== 'Today' || a.status === 'Cancelled') && (
                      <Empty text="No appointments scheduled for today." />
                    )}
                  </div>
                  <button className="panel-action" onClick={() => setAppointmentModal(true)}>
                    <Plus size={15} /> Schedule a new appointment
                  </button>
                </section>

                <section className="panel">
                  <PanelHead
                    title="Your medical team"
                    subtitle="Meet the people behind the care"
                    action={<button className="icon-soft" onClick={() => setPage('Doctors')}><ArrowUpRight size={17} /></button>}
                  />
                  <div className="team-list">
                    {doctors.map(d => (
                      <div className="team-row" key={d.id}>
                        <Avatar initials={d.initials} color={d.color} large />
                        <div className="team-person">
                          <b>{d.name}</b>
                          <span>{d.specialty}</span>
                        </div>
                        <i className={`presence ${d.status === 'Available' ? 'online' : 'busy'}`} />
                      </div>
                    ))}
                  </div>
                  <button className="panel-action" onClick={() => setPage('Doctors')}>
                    Explore doctor directory <ChevronRight size={16} />
                  </button>
                </section>
              </div>

              <div className="care-note">
                <div className="care-icon"><HeartPulse size={22} /></div>
                <div>
                  <b>Care starts with connection.</b>
                  <p>Keep patient information and appointment details organized in one calm, clear workspace.</p>
                </div>
                <span className="sparkle">✳</span>
              </div>
            </>
          )}

          {page === 'Patients' && (
            <>
              <Heading
                eyebrow="PATIENT DIRECTORY"
                title="Patient records"
                description="Keep patient information clear, organized, and easy to find."
                action={
                  <button className="button primary" onClick={() => setPatientModal(true)}>
                    <UserPlus size={17} /> + Add New Patient
                  </button>
                }
              />
              <div className="strip">
                <div className="strip-icon"><Users size={18} /></div>
                <div>
                  <b>{filteredPatients.length}</b>
                  <span>{query ? 'Matching patients' : 'Patients shown'}</span>
                </div>
                <div className="strip-note">
                  <ShieldCheck size={16} /> Handle patient information responsibly
                </div>
              </div>

              <section className="panel table-panel">
                <PanelHead
                  title="All patients"
                  subtitle="Patient directory and contact details"
                  action={<span className="count-chip">{filteredPatients.length} records</span>}
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Patient ID</th>
                        <th>Age / Gender</th>
                        <th>Blood Group</th>
                        <th>Phone / Contact</th>
                        <th>Medical Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="table-person">
                              <Avatar initials={p.initials} color={p.color} />
                              <div>
                                <b>{p.name}</b>
                                {p.email && <span className="person-email">{p.email}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="id-cell">{p.id}</td>
                          <td>{p.age} yrs · {p.gender}</td>
                          <td>
                            {p.bloodGroup ? (
                              <span className="blood-chip">{p.bloodGroup}</span>
                            ) : (
                              <span className="dim-dash">—</span>
                            )}
                          </td>
                          <td>{p.phone}</td>
                          <td><span className="condition">{p.note || p.medicalHistory || 'Routine'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredPatients.length && <Empty text="No patients match your search." />}
                </div>
                <div className="table-foot">MediCore Patient Records · Active Directory</div>
              </section>
            </>
          )}

          {page === 'Doctors' && <DoctorsPage />}

          {page === 'Appointments' && (
            <>
              <Heading
                eyebrow="SCHEDULE & COORDINATE"
                title="Appointments"
                description="Every visit, thoughtfully organized."
                action={
                  <button className="button primary" onClick={() => setAppointmentModal(true)}>
                    <Plus size={17} /> Book appointment
                  </button>
                }
              />
              <div className="summary-strip">
                <Summary icon={CalendarDays} value={appointments.filter(a => a.status !== 'Cancelled').length} label="Active appointments" />
                <Summary icon={Clock3} value={appointments.filter(a => a.date === 'Today' && a.status !== 'Cancelled').length} label="Scheduled today" />
                <Summary icon={Check} value={appointments.filter(a => a.status === 'Confirmed').length} label="Confirmed visits" />
              </div>
              <AppointmentsPage appointments={appointments} onCancel={cancelAppointment} />
            </>
          )}

          <footer className="footer">
            <span>© 2026 MediCore Healthcare</span>
            <span><i /> Connected frontend workspace</span>
          </footer>
        </div>
      </main>

      {mobileNav && (
        <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />
      )}

      {notice && (
        <div className="toast">
          <Check size={17} />{notice}
        </div>
      )}

      <PatientRegistrationModal
        isOpen={patientModal}
        onClose={() => setPatientModal(false)}
        onRegister={handleRegisterPatient}
        existingPatients={patients}
      />

      {appointmentModal && (
        <Modal title="Book an appointment" subtitle="Choose a patient, doctor, and suitable time." onClose={() => setAppointmentModal(false)}>
          <form className="form-grid" onSubmit={addAppointment}>
            <label className="full">
              <span>Patient</span>
              <select name="patientId" required defaultValue="">
                <option value="" disabled>Select patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.id}</option>
                ))}
              </select>
            </label>
            <label className="full">
              <span>Doctor</span>
              <select name="doctorId" required defaultValue="">
                <option value="" disabled>Select doctor</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} · {d.specialty}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" required />
            </label>
            <label>
              <span>Time</span>
              <input name="time" type="time" required />
            </label>
            <label className="full">
              <span>Appointment type</span>
              <select name="type">
                <option>Consultation</option>
                <option>Routine checkup</option>
                <option>Follow-up</option>
                <option>Women's health</option>
                <option>Cardiology review</option>
              </select>
            </label>
            <div className="form-actions full">
              <button type="button" className="button secondary" onClick={() => setAppointmentModal(false)}>
                Cancel
              </button>
              <button className="button primary">
                Book appointment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, note, tint }) {
  return (
    <div className="stat">
      <div className={`stat-icon ${tint}`}><Icon size={20} /></div>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}</b>
      <div className="stat-foot">
        {note}
        <span><ArrowUpRight size={14} /></span>
      </div>
    </div>
  );
}

function PanelHead({ title, subtitle, action }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function formatTime(t) {
  if (!t) return { val: '--:--', period: '' };
  if (t.includes(' ')) {
    const p = t.split(' ');
    return { val: p[0], period: p[1] || '' };
  }
  const parts = t.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { val: `${String(h).padStart(2, '0')}:${m}`, period };
}

function AppointmentRow({ a, onCancel }) {
  const t = formatTime(a.time);
  return (
    <div className="appointment-row">
      <div className="time"><b>{t.val}</b><span>{t.period}</span></div>
      <Avatar initials={a.initials} color={a.color} />
      <div className="appointment-person">
        <b>{a.patient}</b>
        <span>{a.type} · {a.doctor}</span>
      </div>
      <Status>{a.status}</Status>
      <button className="row-menu" title="Cancel appointment" onClick={() => onCancel(a.id)}>
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <div><CalendarDays size={22} /></div>
      <b>{text}</b>
      <span>Try another search or add a new record.</span>
    </div>
  );
}

function DoctorsPage() {
  const [filter, setFilter] = useState('All');
  const visible = doctors.filter(d => filter === 'All' || d.specialty === filter);
  return (
    <>
      <Heading
        eyebrow="OUR PEOPLE"
        title="Meet your doctors"
        description="A dedicated team, committed to thoughtful and personal care."
        action={
          <button className="button secondary" onClick={() => window.alert('Doctor creation will be connected to the backend next.')}>
            <Plus size={17} /> Add doctor
          </button>
        }
      />
      <div className="filters">
        <span>Specialization</span>
        {['All', ...new Set(doctors.map(d => d.specialty))].map(f => (
          <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="doctor-grid">
        {visible.map(d => (
          <article className="doctor-card" key={d.id}>
            <div className={`doctor-cover ${d.color}`}>
              <div className="doctor-avatar"><Stethoscope size={38} /></div>
              <span className="doctor-badge">{d.status}</span>
            </div>
            <div className="doctor-body">
              <small>{d.id}</small>
              <h2>{d.name}</h2>
              <b>{d.specialty}</b>
              <p>{d.experience} of experience in patient-focused care.</p>
              <div className="doctor-foot">
                <span><ShieldCheck size={15} /> Care team</span>
                <ArrowUpRight size={17} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Summary({ icon: Icon, value, label }) {
  return (
    <div className="summary">
      <div><Icon size={20} /></div>
      <section>
        <b>{value}</b>
        <span>{label}</span>
      </section>
    </div>
  );
}

function AppointmentsPage({ appointments, onCancel }) {
  const [filter, setFilter] = useState('All');
  const visible = appointments.filter(a => filter === 'All' || a.status === filter);
  return (
    <section className="panel table-panel">
      <PanelHead
        title="Appointment schedule"
        subtitle="Review and manage scheduled visits"
        action={
          <div className="select-wrap">
            <ClipboardList size={15} />
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option>All</option>
              <option>Confirmed</option>
              <option>Waiting</option>
              <option>Cancelled</option>
            </select>
          </div>
        }
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Appointment type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(a => (
              <tr key={a.id}>
                <td>
                  <div className="table-person">
                    <Avatar initials={a.initials} color={a.color} />
                    <b>{a.patient}</b>
                  </div>
                </td>
                <td>{a.doctor}</td>
                <td>{a.date}</td>
                <td className="time-cell">{a.time}</td>
                <td>{a.type}</td>
                <td><Status>{a.status}</Status></td>
                <td>
                  {a.status !== 'Cancelled' ? (
                    <button className="cancel-link" onClick={() => onCancel(a.id)}>Cancel</button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <Empty text="No appointments for this filter." />}
      </div>
      <div className="table-foot">Demo session only · Not saved permanently</div>
    </section>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">MEDICORE WORKSPACE</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
