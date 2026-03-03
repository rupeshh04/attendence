"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { getMyAttendance } from "../../../utils/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState(null); // photo URL string

  // Build year options: current year and 3 years back
  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role === "admin") { router.push("/admin"); return; }
    setUser(parsed);
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getMyAttendance(page, {
        month: selectedMonth,
        year: selectedYear,
        limit: 15,
      });
      setRecords(res.data.records);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
      setCurrentPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (user) fetchRecords(1);
  }, [user, fetchRecords]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const totalMarked = records.length;

  // Working days in selected month (Mon-Fri)
  const workingDays = getWorkingDays(selectedYear, selectedMonth);
  const attendancePct = workingDays > 0
    ? Math.round((totalMarked / workingDays) * 100)
    : 0;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  }

  function getDayOfWeek(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
            <p className="text-gray-500 text-sm mt-0.5">View and filter your past attendance records</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-400 ml-auto">
            Showing {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Present"
            value={presentCount}
            sub={`of ${workingDays} working days`}
            color="green"
            icon="✅"
          />
          <StatCard
            label="Late"
            value={lateCount}
            sub="arrivals after 9:30 AM"
            color="yellow"
            icon="⏰"
          />
          <StatCard
            label="Absent"
            value={Math.max(0, workingDays - totalMarked)}
            sub="days not marked"
            color="red"
            icon="❌"
          />
          <StatCard
            label="Attendance %"
            value={`${attendancePct}%`}
            sub={`${totalMarked} days marked`}
            color="blue"
            icon="📊"
          />
        </div>

        {/* Attendance Progress Bar */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Monthly Attendance Rate</p>
            <span className={`text-sm font-bold ${
              attendancePct >= 90 ? "text-green-600"
              : attendancePct >= 75 ? "text-yellow-600"
              : "text-red-600"
            }`}>{attendancePct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                attendancePct >= 90 ? "bg-green-500"
                : attendancePct >= 75 ? "bg-yellow-500"
                : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, attendancePct)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {totalMarked} marked / {workingDays} working days
          </p>
        </div>

        {/* Records Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Records</h2>
            <span className="text-sm text-gray-500">{total} total entries</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-500 font-medium">No records found</p>
              <p className="text-gray-400 text-sm mt-1">
                No attendance was marked in {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Day</th>
                      <th className="pb-3 font-medium">Check-in</th>
                      <th className="pb-3 font-medium">Check-out</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Photos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((record, idx) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-400 text-xs">
                          {(currentPage - 1) * 15 + idx + 1}
                        </td>
                        <td className="py-3 font-medium text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="py-3 text-gray-500 text-xs">
                          {getDayOfWeek(record.date)}
                        </td>
                        {/* Check-in */}
                        <td className="py-3">
                          <p className="text-gray-700 text-sm font-medium flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {record.time}
                          </p>
                          <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-0.5 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            Map
                          </a>
                        </td>
                        {/* Check-out */}
                        <td className="py-3">
                          {record.checkoutTime ? (
                            <>
                              <p className="text-orange-600 text-sm font-medium flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {record.checkoutTime}
                              </p>
                              <a href={`https://www.google.com/maps?q=${record.checkoutLatitude},${record.checkoutLongitude}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs text-blue-500 hover:underline mt-0.5 flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                Map
                              </a>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 italic">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={record.status} />
                        </td>
                        {/* Photos */}
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setPhotoModal(record.photo)} className="group relative" title="Check-in photo">
                              <img src={record.photo} alt="check-in"
                                className="w-9 h-9 rounded-lg object-cover border-2 border-green-200 group-hover:border-green-400 transition-all" />
                            </button>
                            {record.checkoutPhoto ? (
                              <button onClick={() => setPhotoModal(record.checkoutPhoto)} className="group relative" title="Check-out photo">
                                <img src={record.checkoutPhoto} alt="check-out"
                                  className="w-9 h-9 rounded-lg object-cover border-2 border-orange-200 group-hover:border-orange-400 transition-all" />
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {records.map((record) => (
                  <div key={record._id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={record.status} />
                          <span className="text-xs text-gray-400">{getDayOfWeek(record.date)}</span>
                        </div>
                        <p className="font-semibold text-gray-900">{formatDate(record.date)}</p>
                        <p className="text-sm text-green-600 mt-1">→ In: {record.time}</p>
                        {record.checkoutTime
                          ? <p className="text-sm text-orange-500">← Out: {record.checkoutTime}</p>
                          : <p className="text-xs text-gray-300 mt-0.5">No checkout</p>}
                        <div className="flex gap-2 mt-1.5">
                          <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500">In map ↗</a>
                          {record.checkoutLatitude && (
                            <a href={`https://www.google.com/maps?q=${record.checkoutLatitude},${record.checkoutLongitude}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-blue-500">Out map ↗</a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => setPhotoModal(record.photo)}>
                          <img src={record.photo} alt="check-in"
                            className="w-12 h-12 rounded-xl object-cover border-2 border-green-200" />
                        </button>
                        {record.checkoutPhoto && (
                          <button onClick={() => setPhotoModal(record.checkoutPhoto)}>
                            <img src={record.checkoutPhoto} alt="check-out"
                              className="w-12 h-12 rounded-xl object-cover border-2 border-orange-200" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => fetchRecords(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchRecords(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchRecords(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-gray-900">Attendance Photo</span>
              <button
                onClick={() => setPhotoModal(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={photoModal}
              alt="Attendance selfie"
              className="w-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Present
      </span>
    );
  }
  if (status === "late") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Late
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Absent
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  const colors = {
    green:  "bg-green-50  text-green-700  border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    red:    "bg-red-50    text-red-700    border-red-100",
    blue:   "bg-blue-50   text-blue-700   border-blue-100",
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-70">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-60">{sub}</p>
    </div>
  );
}

// Count Mon-Fri working days in a given month
function getWorkingDays(year, month) {
  const totalDays = new Date(year, month, 0).getDate(); // days in month
  let count = 0;
  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(year, month - 1, d).getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
