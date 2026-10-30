# MediCore — Patient & Doctor Management System

**MediCore** is a clinical administration and appointment coordination platform built with a layered Object-Oriented Programming (OOP) Python backend, an SQLite database with referential integrity, and a responsive modern React + Vite dashboard frontend.

---

## 1. System Architecture

MediCore adopts a layered software architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                    │
│   (Dashboard, Patients, Doctors, Appointments, Analytics)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    Flask API Layer (app.py)                 │
│         (Routing, Blueprints, Error Handlers, CORS)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes
┌──────────────────────────────▼──────────────────────────────┐
│                  Business Services (services.py)            │
│  PatientService │ DoctorService │ AppointmentService │ Stats│
└──────────────┬───────────────────────────────┬──────────────┘
               │ Instantiates                  │ Queries/Transacts
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│     OOP Models (models.py)  │ │ Database Layer (database.py)│
│  BaseEntity, Patient,       │ │ DatabaseManager, Schema,    │
│  Doctor, Appointment        │ │ Indexes, Audit Logging      │
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │
                                ┌──────────────▼──────────────┐
                                │       SQLite Database       │
                                │ (Foreign Keys, Constraints) │
                                └─────────────────────────────┘
```

### OOP Principles Applied
- **Abstraction**: `BaseEntity` defines standard contracts for identifiers (`id`), timestamps (`created_at`, `updated_at`), serialization (`to_dict()`), and invariant validation (`validate()`).
- **Encapsulation**: Entity properties are accessed and mutated through validated setters and domain methods (`Patient.update_details()`, `Doctor.set_availability()`, `Appointment.reschedule()`).
- **Inheritance**: `Patient`, `Doctor`, and `Appointment` inherit common behavior from `BaseEntity`.
- **State Machine Workflow**: Appointments transition between `SCHEDULED` -> `RESCHEDULED` -> `COMPLETED` or `CANCELLED`. Completed appointments are strictly immutable and cannot be cancelled or rescheduled.
- **Separation of Concerns**: HTTP handlers in `app.py` delegate all domain operations to service classes in `services.py`. All SQLite queries, transactions, and foreign-key checks are encapsulated in `DatabaseManager` (`database.py`).

---

## 2. Technology Stack

### Backend
- **Python 3.12+**
- **Flask**: Lightweight REST API web framework.
- **Flask-CORS**: Configurable cross-origin resource sharing.
- **SQLite3**: ACID-compliant relational database with foreign key enforcement (`PRAGMA foreign_keys = ON;`).
- **pytest**: Automated unit and integration testing suite.
- **python-dotenv**: Environment configuration.

### Frontend
- **React 18**: UI component library.
- **Vite 5**: Fast frontend bundler and development server.
- **Recharts**: Responsive charting library for appointment and workload metrics.
- **Lucide React**: Modern SVG iconography.
- **Modern CSS**: Custom responsive design system, modal dialogs, and toast notifications.

---

## 3. Project Directory Structure

```
OOP Mini Project/
├── backend/
│   ├── app.py                 # Flask REST application & centralized error handlers
│   ├── database.py            # SQLite DatabaseManager, schemas, indexing, audit logs
│   ├── models.py              # OOP domain models (BaseEntity, Patient, Doctor, Appointment)
│   ├── services.py            # Domain services (PatientService, DoctorService, AppointmentService, DashboardService)
│   ├── seed_data.py           # Realistic synthetic seed generator (no real patient PII)
│   ├── requirements.txt       # Backend dependencies
│   ├── .env.example           # Backend environment template
│   └── tests/
│       ├── __init__.py
│       └── test_backend.py    # 15 automated pytest test cases
├── frontend/
│   ├── index.html             # HTML entry point with Plus Jakarta Sans typography
│   ├── package.json           # Frontend dependencies and scripts
│   ├── vite.config.js         # Vite bundler configuration & backend API proxy
│   ├── .env.example           # Frontend environment template
│   └── src/
│       ├── main.jsx           # React DOM root mounting
│       ├── App.jsx            # Main app shell, navigation router, and toast provider
│       ├── index.css          # Healthcare UI design tokens and responsive layout
│       ├── services/
│       │   └── api.js         # Reusable fetch client connecting to REST endpoints
│       ├── utils/
│       │   └── formatters.js  # Date/time, phone, status badges, and initials helpers
│       ├── components/
│       │   ├── Navbar.jsx     # Header with live time, quick actions, and mobile toggle
│       │   ├── Sidebar.jsx    # Navigation sidebar with persistent status badge
│       │   ├── Modal.jsx      # Accessible modal dialog with backdrop blur & ESC dismiss
│       │   ├── ConfirmDialog.jsx # Confirmation dialog for destructive actions
│       │   ├── StatusBadge.jsx # Pill badges with status dots
│       │   └── Toast.jsx      # Slide-in toast notification container
│       └── pages/
│           ├── Dashboard.jsx  # Metrics, Recharts analytics, today's schedule, audit feed
│           ├── Patients.jsx   # Searchable patient directory with Add/Edit/Delete
│           ├── PatientDetail.jsx # Patient medical history and appointment records
│           ├── Doctors.jsx    # Doctor staff directory with availability toggles
│           ├── Appointments.jsx # Conflict-aware appointment scheduler & filters
│           └── AppointmentDetail.jsx # Detailed appointment case file view
├── README.md
└── .gitignore
```

---

## 4. Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database with synthetic records:
   ```bash
   python seed_data.py
   ```
5. Start the Flask REST API server:
   ```bash
   python app.py
   ```
   *The backend starts by default on `http://127.0.0.1:5050`.*

### Frontend Setup
1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard opens at `http://localhost:5173`.*

---

## 5. REST API Documentation

### Patients
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/patients` | Retrieve all patients (supports `?search=` by name, phone, or ID). |
| `GET` | `/api/patients/<id>` | Retrieve patient by ID including full appointment history. |
| `POST` | `/api/patients` | Register a new patient. Validates age (0-130), phone format, and required name. |
| `PUT` | `/api/patients/<id>` | Update patient details. |
| `DELETE` | `/api/patients/<id>` | Delete a patient. Rejects deletion if active appointments exist. |

### Doctors
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/doctors` | Retrieve doctors (supports `?search=`, `?specialization=`, `?available=`). |
| `GET` | `/api/doctors/<id>` | Retrieve doctor by ID with their assigned appointments. |
| `POST` | `/api/doctors` | Register a new doctor. |
| `PUT` | `/api/doctors/<id>` | Update doctor details or toggle availability. |
| `GET` | `/api/doctors/specializations` | Get list of distinct medical specializations. |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/appointments` | Retrieve appointments (supports `?patient_id=`, `?doctor_id=`, `?date=`, `?status=`). |
| `GET` | `/api/appointments/<id>` | Retrieve appointment case file. |
| `POST` | `/api/appointments` | Book appointment. Enforces future time, doctor availability, and non-overlapping slots. |
| `PUT` | `/api/appointments/<id>/reschedule` | Reschedule appointment to a new validated future time. |
| `PATCH` | `/api/appointments/<id>/cancel` | Cancel an active appointment and free up the doctor's calendar slot. |
| `PATCH` | `/api/appointments/<id>/complete` | Mark an appointment as completed. |

### Dashboard & Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated metrics (total counts, today's schedule, upcoming active, Recharts data, and audit feed). |
| `GET` | `/api/health` | Service health status check. |

---

## 6. Business Rules & Conflict Prevention

1. **Future Scheduling**: Appointments must be scheduled in the future relative to the current timestamp. Past dates are rejected with a 400 Bad Request.
2. **Doctor Availability**: Appointments can only be booked with doctors whose status is `is_available = true`. Unavailable doctors are disabled on the frontend and rejected by the service layer.
3. **Collision Detection**: For any active appointment (`SCHEDULED` or `RESCHEDULED`), two time intervals `[S1, E1)` and `[S2, E2)` overlap if `S1 < E2` and `S2 < E1`. If a conflict exists, the API rejects booking with a `409 Conflict`.
4. **Cancellation Frees Time**: When an appointment is cancelled, its status changes to `CANCELLED`, immediately releasing the doctor's calendar slot. Cancelled appointments cannot be cancelled again.
5. **Completed Immutability**: Completed appointments (`COMPLETED`) cannot be cancelled or rescheduled.
6. **Patient Deletion Protection**: A patient cannot be deleted while they have active (`SCHEDULED` or `RESCHEDULED`) appointments.

---

## 7. Automated Testing

The backend includes a comprehensive `pytest` test suite in `backend/tests/test_backend.py` utilizing isolated temporary databases.

To run tests:
```bash
cd backend
./venv/bin/pytest -v
```

### Test Coverage Highlights
- `test_patient_creation_and_retrieval`: Validates model persistence and property encapsulation.
- `test_patient_validation_errors`: Asserts validation failures for negative age, empty name, and invalid phone formats.
- `test_patient_search_and_update`: Tests name substring search and numeric ID lookup.
- `test_doctor_registration_and_availability`: Tests doctor model and availability status toggle.
- `test_appointment_booking_success`: Tests successful booking in the future with name joins.
- `test_appointment_nonexistent_patient_or_doctor`: Asserts 404/NotFoundError for invalid IDs.
- `test_appointment_past_date_rejected`: Asserts future date requirement.
- `test_appointment_with_unavailable_doctor_rejected`: Asserts booking rejection for unavailable physicians.
- `test_appointment_conflict_detection`: Asserts that overlapping active appointments trigger conflict errors.
- `test_cancellation_frees_slot_and_prevents_duplicate_cancel`: Tests slot freeing upon cancellation.
- `test_reschedule_validation_and_conflict`: Tests reschedule validation and collision prevention.
- `test_completed_appointment_immutability`: Ensures completed appointments cannot be modified.
- `test_cannot_delete_patient_with_active_appointments`: Verifies referential safety.
- `test_database_persistence`: Tests data survival across separate database connections.
- `test_rest_api_full_flow`: End-to-end REST API integration test through Flask test client.

---

## 8. Security, Privacy & Compliance Notice

- **Input Validation**: Server-side validation on all entity fields.
- **SQL Injection Prevention**: Parameterized SQLite queries throughout `database.py`.
- **CORS Safeguards**: Configurable allowed origins via `CORS_ORIGINS`.
- **Audit Logging**: Changes to patient, doctor, and appointment records are logged in `audit_logs` without storing sensitive patient medical details.
- **Synthetic Data**: All seed and test data uses synthetic identities.
- *Notice: This application is built for administrative demonstration and pairs with an OOP Python curriculum. Before processing real-world protected health information (PHI), ensure complete compliance review under applicable privacy frameworks (such as HIPAA).*
