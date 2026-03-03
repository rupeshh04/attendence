# AttendEase — Full-Stack Attendance Management System

A production-ready Attendance Management System built with **Next.js 14**, **Node.js/Express**, and **MongoDB**, featuring geo-fencing, live camera capture, JWT authentication, and an admin panel.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT + Bcrypt |
| Photos | Cloudinary |
| Geo | Browser Geolocation API + Haversine formula |

---

## Project Structure

```
Attendence/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── models/
│   │   ├── User.js                # User model (admin/employee)
│   │   └── Attendance.js          # Attendance model
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT protect + adminOnly
│   ├── routes/
│   │   ├── authRoutes.js          # Auth + Employee CRUD
│   │   └── attendanceRoutes.js    # Attendance + admin routes
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── app/
    │   ├── layout.js
    │   ├── page.js                # Redirect to login/dashboard
    │   ├── login/page.js          # Login page
    │   ├── setup/page.js          # First-time admin setup
    │   ├── dashboard/page.js      # Employee dashboard
    │   └── admin/
    │       ├── page.js            # Admin dashboard
    │       ├── employees/page.js  # CRUD employees
    │       └── attendance/page.js # Filter, view, export
    ├── components/
    │   ├── Navbar.js
    │   └── CameraModal.js         # Live camera + GPS capture
    ├── utils/
    │   └── api.js                 # Axios instance + all API calls
    ├── .env.example
    └── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (free tier works)

---

### 1. Clone / Open the project

```bash
cd /path/to/Attendence
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/attendance_db
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
PORT=5000
CLIENT_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Office geo-fence center (change to your office location)
OFFICE_LATITUDE=28.6139
OFFICE_LONGITUDE=77.2090
ALLOWED_RADIUS_METERS=100
```

Start the backend:

```bash
# Development
npm run dev

# Production
npm start
```

Backend will run on `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Start the frontend:

```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

---

### 4. First-time Setup

1. Open `http://localhost:3000/setup`
2. Create the **admin account** (only works once — if no admin exists)
3. Login at `/login`
4. Go to **Employees** → Add employee accounts
5. Employees can login and mark attendance

---

## API Reference

### Auth Routes `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/login` | Public | Login |
| POST | `/register` | Public | Create first admin |
| GET | `/me` | Private | Get current user |
| POST | `/create-employee` | Admin | Create employee |
| GET | `/employees` | Admin | List all employees |
| PUT | `/employees/:id` | Admin | Update employee |
| DELETE | `/employees/:id` | Admin | Delete employee |

### Attendance Routes `/api/attendance`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/mark` | Employee | Mark attendance with photo + GPS |
| GET | `/my` | Employee | Own attendance history |
| GET | `/today-status` | Employee | Check if marked today |
| GET | `/all` | Admin | All records with filters |
| GET | `/export` | Admin | Export data as JSON (CSV on frontend) |
| GET | `/stats` | Admin | Dashboard stats |

---

## Features

### Employee
- Login → Employee Dashboard
- **Mark Attendance**: Opens live camera → Captures selfie → Gets GPS coordinates → Validates geo-fence → Saves to DB
- Prevents duplicate attendance on same date
- View own attendance history with pagination
- Stats: monthly count, on-time vs late

### Admin
- Admin Dashboard with real-time stats
- Add / Edit / Delete employees
- View all attendance records
- **Filter** by date and employee
- **Export to CSV** with one click
- Photo thumbnails with Cloudinary links
- Google Maps location links for each record

### Geo-fencing
- Uses the **Haversine formula** to calculate GPS distance
- Rejects attendance if employee is >100m from office
- Office coordinates set via environment variables

### Security
- JWT tokens with 7-day expiry
- Passwords hashed with bcrypt (salt rounds: 10)
- Protected routes with middleware
- Role-based access (admin / employee)
- MongoDB compound index prevents duplicate attendance

---

## Deployment

### Backend → Render / Railway

1. Push code to GitHub
2. Create new Web Service
3. Set environment variables in dashboard
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend → Vercel

1. Push to GitHub
2. Import in Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

---

## Environment Variables Reference

### Backend `.env`

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRE` | Token expiry (e.g., `7d`) |
| `PORT` | Server port (default: 5000) |
| `CLIENT_URL` | Frontend URL for CORS |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `OFFICE_LATITUDE` | Office latitude for geo-fence |
| `OFFICE_LONGITUDE` | Office longitude for geo-fence |
| `ALLOWED_RADIUS_METERS` | Geo-fence radius in meters (default: 100) |

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
