const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Haversine formula to calculate distance between two coordinates (in meters)
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @route   POST /api/attendance/mark
// @desc    Mark attendance (employee)
// @access  Private
router.post("/mark", protect, async (req, res) => {
  try {
    const { photo, latitude, longitude, clientDate, clientTime, clientHour, clientMinute } = req.body;

    if (!photo || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "Photo, latitude, and longitude are required" });
    }

    // Prefer client-supplied local date/time so the recorded time is always in
    // the user's timezone, not the server's UTC timezone (critical on Vercel).
    const now = new Date();
    const today = clientDate || now.toISOString().split("T")[0];
    const timeStr = clientTime || now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const hours = clientHour !== undefined ? Number(clientHour) : now.getUTCHours();
    const minutes = clientMinute !== undefined ? Number(clientMinute) : now.getUTCMinutes();

    const existing = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for today" });
    }

    // Store photo as base64 directly (no Cloudinary)
    const photoUrl = photo;

    // Determine status: late if after 9:30 AM (local time)
    const isLate = hours > 9 || (hours === 9 && minutes > 30);

    const attendance = await Attendance.create({
      userId: req.user._id,
      date: today,
      time: timeStr,
      photo: photoUrl,
      latitude,
      longitude,
      status: isLate ? "late" : "present",
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for today" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/my
// @desc    Get logged-in employee's attendance history
// @access  Private
router.get("/my", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, month, year } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };

    // Filter by month/year if provided (date stored as "YYYY-MM-DD")
    if (year && month) {
      const mm = String(month).padStart(2, "0");
      filter.date = { $regex: `^${year}-${mm}` };
    } else if (year) {
      filter.date = { $regex: `^${year}` };
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(filter);

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/attendance/checkout
// @desc    Mark checkout (employee)
// @access  Private
router.post("/checkout", protect, async (req, res) => {
  try {
    const { photo, latitude, longitude, clientDate, clientTime } = req.body;
    if (!photo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Photo, latitude, and longitude are required" });
    }

    // Use client's local date so checkout matches the same date as check-in
    const now = new Date();
    const today = clientDate || now.toISOString().split("T")[0];
    const timeStr = clientTime || now.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    const record = await Attendance.findOne({ userId: req.user._id, date: today });

    if (!record) {
      return res.status(400).json({ message: "You haven't checked in today yet" });
    }
    if (record.checkoutTime) {
      return res.status(400).json({ message: "You have already checked out today" });
    }

    record.checkoutTime = timeStr;
    record.checkoutPhoto = photo;
    record.checkoutLatitude = latitude;
    record.checkoutLongitude = longitude;
    await record.save();

    res.json({ message: "Checkout successful", record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/today-status
// @desc    Check if employee marked attendance today
// @access  Private
router.get("/today-status", protect, async (req, res) => {
  try {
    // clientDate is sent by the frontend in "YYYY-MM-DD" local time
    // to avoid UTC offset mismatches on Vercel
    const today = req.query.clientDate || new Date().toISOString().split("T")[0];
    const record = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });
    res.json({ marked: !!record, record: record || null });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// @route   GET /api/attendance/all
// @desc    Get all attendance records
// @access  Private/Admin
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (date) filter.date = date;
    if (employeeId) filter.userId = employeeId;

    const records = await Attendance.find(filter)
      .populate("userId", "name email department")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(filter);

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/export
// @desc    Export attendance as JSON (frontend handles CSV)
// @access  Private/Admin
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (employeeId) filter.userId = employeeId;

    const records = await Attendance.find(filter)
      .populate("userId", "name email department")
      .sort({ date: -1 });

    const data = records.map((r) => ({
      Employee: r.userId?.name || "N/A",
      Email: r.userId?.email || "N/A",
      Department: r.userId?.department || "N/A",
      Date: r.date,
      Time: r.time,
      Status: r.status,
      Latitude: r.latitude,
      Longitude: r.longitude,
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get attendance stats for admin dashboard
// @access  Private/Admin
// NOTE: defined BEFORE /:id routes so Express matches it correctly
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const totalEmployees = await User.countDocuments({ role: "employee", isActive: true });
    const todayAttendance = await Attendance.countDocuments({ date: today });
    const lateToday = await Attendance.countDocuments({ date: today, status: "late" });

    res.json({
      totalEmployees,
      todayPresent: todayAttendance,
      todayAbsent: totalEmployees - todayAttendance,
      lateToday,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/monthly-calendar
// @desc    Date-wise attendance calendar for one employee (admin: any, employee: own)
// @access  Private
router.get("/monthly-calendar", protect, async (req, res) => {
  try {
    const { year, month, employeeId } = req.query;
    const now = new Date();
    const y  = parseInt(year  || now.getFullYear());
    const m  = parseInt(month || now.getMonth() + 1);
    const mm = String(m).padStart(2, "0");

    // Employees can only query their own; admins can query any
    let userId = req.user._id;
    if (req.user.role === "admin" && employeeId) {
      userId = employeeId;
    } else if (req.user.role !== "admin" && employeeId &&
               String(employeeId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const records = await Attendance.find({
      userId,
      date: { $regex: `^${y}-${mm}` },
    }).select("date status time checkoutTime").lean();

    // { "YYYY-MM-DD": { status, time, checkoutTime } }
    const dateMap = {};
    for (const r of records) {
      dateMap[r.date] = {
        status:       r.status,
        time:         r.time || null,
        checkoutTime: r.checkoutTime || null,
      };
    }

    res.json({ year: y, month: m, dateMap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/attendance/monthly-summary
// @desc    Employee-wise monthly attendance summary
// @access  Private/Admin
router.get("/monthly-summary", protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year  || now.getFullYear());
    const month = parseInt(req.query.month || now.getMonth() + 1); // 1-12
    const mm    = String(month).padStart(2, "0");
    const prefix = `${year}-${mm}`; // "YYYY-MM"

    // Working days (Mon–Sat, Sunday off) in the requested month
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay(); // 0=Sun,6=Sat
      if (dow !== 0) workingDays++; // Only Sunday is off
    }

    // All active employees
    const employees = await User.find({ role: "employee", isActive: true })
      .select("name email department")
      .lean();

    // All attendance records for the month
    const records = await Attendance.find({ date: { $regex: `^${prefix}` } })
      .select("userId status date")
      .lean();

    // Group by userId
    const byUser = {};
    for (const r of records) {
      const uid = String(r.userId);
      if (!byUser[uid]) byUser[uid] = { present: 0, late: 0 };
      if (r.status === "present") byUser[uid].present++;
      else if (r.status === "late") byUser[uid].late++;
    }

    const summary = employees.map((emp) => {
      const uid    = String(emp._id);
      const present = byUser[uid]?.present || 0;
      const late    = byUser[uid]?.late    || 0;
      const attended = present + late;
      const absent   = Math.max(0, workingDays - attended);
      const pct      = workingDays > 0 ? Math.round((attended / workingDays) * 100) : 0;
      return {
        _id:        emp._id,
        name:       emp.name,
        email:      emp.email,
        department: emp.department || "—",
        present,
        late,
        absent,
        workingDays,
        attendancePct: pct,
      };
    });

    // Sort by name
    summary.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ year, month, workingDays, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Edit an attendance record (admin)
// @access  Private/Admin
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status, time, date } = req.body;

    const allowed = ["present", "late", "absent"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (status !== undefined) record.status = status;
    if (time !== undefined)   record.time   = time;
    if (date !== undefined)   record.date   = date;

    await record.save();
    const updated = await Attendance.findById(record._id).populate("userId", "name email department");
    res.json({ message: "Record updated", record: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete an attendance record (admin)
// @access  Private/Admin
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
