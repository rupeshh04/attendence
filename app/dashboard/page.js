"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import CameraModal from "../../components/CameraModal";
import { markAttendance, checkoutAttendance, getMyAttendance, getTodayStatus } from "../../utils/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("checkin"); // 'checkin' | 'checkout'
  const [todayMarked, setTodayMarked] = useState(false);
  const [todayCheckedOut, setTodayCheckedOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) { router.push("/login"); return; }
    const parsed = JSON.parse(storedUser);
    if (parsed.role === "admin") { router.push("/admin"); return; }
    setUser(parsed);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, histRes] = await Promise.all([
        getTodayStatus(),
        getMyAttendance(1),
      ]);
      setTodayMarked(statusRes.data.marked);
      setTodayRecord(statusRes.data.record);
      setTodayCheckedOut(!!statusRes.data.record?.checkoutTime);
      setHistory(histRes.data.records);
      setTotalPages(histRes.data.pages);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (page) => {
    try {
      const res = await getMyAttendance(page);
      setHistory(res.data.records);
      setCurrentPage(page);
    } catch (e) {}
  };

  const handleCapture = async ({ photo, latitude, longitude, clientDate, clientTime, clientHour, clientMinute }) => {
    setShowCamera(false);
    setMarking(true);
    setMessage(null);
    // Pass local time fields so the server records the user's timezone, not UTC
    const timePayload = { photo, latitude, longitude, clientDate, clientTime, clientHour, clientMinute };
    try {
      if (cameraMode === "checkout") {
        await checkoutAttendance(timePayload);
        setMessage({ type: "success", text: "Checked out successfully!" });
      } else {
        await markAttendance(timePayload);
        setMessage({ type: "success", text: "Attendance marked successfully!" });
      }
      fetchData();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Action failed.",
      });
    } finally {
      setMarking(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* Greeting */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Good {getGreeting()}, {user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{today}</p>
            </div>
            <div className="shrink-0 text-right">
              {todayMarked ? (
                <div>
                  <span className="badge-present text-xs sm:text-sm">✓ Present</span>
                  {todayRecord && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                      In: {todayRecord.time}
                      {todayRecord.checkoutTime && ` · Out: ${todayRecord.checkoutTime}`}
                    </p>
                  )}
                </div>
              ) : (
                <span className="badge-absent text-xs sm:text-sm">Not marked</span>
              )}
            </div>
          </div>
        </div>

        {/* Alert message */}
        {message && (
          <div
            className={`rounded-xl p-3 sm:p-4 flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <span className="text-base sm:text-lg shrink-0">{message.type === "success" ? "✅" : "❌"}</span>
            <p className="font-medium text-sm sm:text-base">{message.text}</p>
          </div>
        )}

        {/* Mark Attendance / Checkout Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Today's Attendance</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {!todayMarked
                  ? "Tap Check In to capture your photo and location."
                  : !todayCheckedOut
                  ? `Checked in at ${todayRecord?.time}. Tap Check Out when done.`
                  : `Checked in at ${todayRecord?.time} · Checked out at ${todayRecord?.checkoutTime}`}
              </p>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              {/* Check In button */}
              <button
                onClick={() => { setCameraMode("checkin"); setShowCamera(true); }}
                disabled={todayMarked || marking}
                className={`w-full sm:w-auto shrink-0 btn-primary px-5 py-3 flex items-center justify-center gap-2 text-sm sm:text-base ${
                  todayMarked ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {marking && cameraMode === "checkin" ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Submitting...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {todayMarked ? "Checked In ✓" : "Check In"}
                  </>
                )}
              </button>
              {/* Check Out button — only visible after check-in */}
              {todayMarked && (
                <button
                  onClick={() => { setCameraMode("checkout"); setShowCamera(true); }}
                  disabled={todayCheckedOut || marking}
                  className={`w-full sm:w-auto shrink-0 px-5 py-3 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold rounded-lg transition-colors ${
                    todayCheckedOut
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  {marking && cameraMode === "checkout" ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Submitting...</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {todayCheckedOut ? "Checked Out ✓" : "Check Out"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="This Month" value={countThisMonth(history)} color="blue" />
          <StatCard label="On Time" value={history.filter((h) => h.status === "present").length} color="green" />
          <StatCard label="Late" value={history.filter((h) => h.status === "late").length} color="yellow" />
          <StatCard label="Total Days" value={history.length} color="purple" />
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Attendance</h2>
            <a href="/dashboard/history" className="text-xs sm:text-sm text-blue-600 hover:underline font-medium">
              View all →
            </a>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-500 text-sm">No attendance records yet.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Check-in</th>
                      <th className="pb-3 font-medium">Check-out</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{formatDate(record.date)}</td>
                        <td className="py-3 text-gray-600 text-sm">{record.time}</td>
                        <td className="py-3 text-sm">
                          {record.checkoutTime ? (
                            <span className="text-orange-600 font-medium">{record.checkoutTime}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={record.status === "present" ? "badge-present" : "badge-late"}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <a href={record.photo} target="_blank" rel="noreferrer">
                              <img src={record.photo} alt="check-in" className="w-8 h-8 rounded-lg object-cover border-2 border-green-200" title="Check-in" />
                            </a>
                            {record.checkoutPhoto && (
                              <a href={record.checkoutPhoto} target="_blank" rel="noreferrer">
                                <img src={record.checkoutPhoto} alt="check-out" className="w-8 h-8 rounded-lg object-cover border-2 border-orange-200" title="Check-out" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {history.map((record) => (
                  <div key={record._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="shrink-0 flex flex-col gap-1">
                      <a href={record.photo} target="_blank" rel="noreferrer">
                        <img src={record.photo} alt="check-in" className="w-10 h-10 rounded-lg object-cover border-2 border-green-200" />
                      </a>
                      {record.checkoutPhoto && (
                        <a href={record.checkoutPhoto} target="_blank" rel="noreferrer">
                          <img src={record.checkoutPhoto} alt="check-out" className="w-10 h-10 rounded-lg object-cover border-2 border-orange-200" />
                        </a>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{formatDate(record.date)}</p>
                      <p className="text-xs text-green-600 mt-0.5">→ In: {record.time}</p>
                      {record.checkoutTime
                        ? <p className="text-xs text-orange-500">← Out: {record.checkoutTime}</p>
                        : <p className="text-xs text-gray-300">No checkout</p>}
                    </div>
                    <span className={record.status === "present" ? "badge-present shrink-0" : "badge-late shrink-0"}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => loadMore(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => loadMore(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        p === currentPage
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => loadMore(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showCamera && (
        <CameraModal
          title={cameraMode === "checkout" ? "Check Out" : "Check In"}
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:   "bg-blue-50   text-blue-700   border border-blue-100",
    green:  "bg-green-50  text-green-700  border border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-100",
    purple: "bg-purple-50 text-purple-700 border border-purple-100",
  };
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${colors[color]}`}>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      <p className="text-xs sm:text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function countThisMonth(history) {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  return history.filter((h) => {
    const d = new Date(h.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
