"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getAttendanceStats, getAllAttendance, getMonthlySummary } from "../../utils/api";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser]                   = useState(null);
  const [stats, setStats]                 = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading]             = useState(true);

  // Monthly summary state
  const now = new Date();
  const [summaryYear,  setSummaryYear]  = useState(now.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summary,      setSummary]      = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== "admin") { router.push("/dashboard"); return; }
    setUser(parsed);
    fetchData();
  }, []);

  // Fetch monthly summary whenever year/month changes
  useEffect(() => {
    if (!user) return;
    fetchSummary(summaryYear, summaryMonth);
  }, [summaryYear, summaryMonth, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [statsRes, attendRes] = await Promise.all([
        getAttendanceStats(),
        getAllAttendance({ date: today, limit: 10 }),
      ]);
      setStats(statsRes.data);
      setRecentAttendance(attendRes.data.records);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (year, month) => {
    setSummaryLoading(true);
    try {
      const { data } = await getMonthlySummary(year, month);
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Year options: current year and 2 previous
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">{today}</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard title="Total Employees" value={stats.totalEmployees} icon="👥" color="bg-blue-50 text-blue-700 border-blue-100" />
            <AdminStatCard title="Present Today"   value={stats.todayPresent}   icon="✅" color="bg-green-50 text-green-700 border-green-100" />
            <AdminStatCard title="Absent Today"    value={stats.todayAbsent}    icon="❌" color="bg-red-50 text-red-700 border-red-100" />
            <AdminStatCard title="Late Today"      value={stats.lateToday}      icon="⏰" color="bg-yellow-50 text-yellow-700 border-yellow-100" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/admin/employees" className="card hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Employees</h3>
                <p className="text-sm text-gray-500">Add, edit, remove employees</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/attendance" className="card hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Attendance</h3>
                <p className="text-sm text-gray-500">Filter, view & export records</p>
              </div>
            </div>
          </Link>

          <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Attendance Rate</h3>
                <p className="text-2xl font-bold mt-1">
                  {stats?.totalEmployees > 0
                    ? Math.round((stats.todayPresent / stats.totalEmployees) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Monthly Summary ──────────────────────────────────────────────────── */}
        <div className="card">
          {/* Header + month/year picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Employee Monthly Attendance</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {summary ? `${summary.workingDays} working days in ${MONTHS[summaryMonth - 1]} ${summaryYear}` : "Loading…"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(Number(e.target.value))}
                className="input-field !py-1.5 !text-sm w-36"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(Number(e.target.value))}
                className="input-field !py-1.5 !text-sm w-24"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {summaryLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !summary || summary.summary.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 bg-gray-50">
                    <th className="px-4 py-3 font-medium rounded-l-lg">Employee</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Department</th>
                    <th className="px-4 py-3 font-medium text-green-700">Present</th>
                    <th className="px-4 py-3 font-medium text-yellow-600">Late</th>
                    <th className="px-4 py-3 font-medium text-red-600">Absent</th>
                    <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Working Days</th>
                    <th className="px-4 py-3 font-medium rounded-r-lg">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.summary.map((emp) => {
                    const pct = emp.attendancePct;
                    const barColor =
                      pct >= 90 ? "bg-green-500" :
                      pct >= 75 ? "bg-yellow-400" : "bg-red-500";
                    return (
                      <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{emp.department}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-green-50 text-green-700 font-bold text-sm">
                            {emp.present}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-yellow-50 text-yellow-700 font-bold text-sm">
                            {emp.late}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-red-50 text-red-600 font-bold text-sm">
                            {emp.absent}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{emp.workingDays}</td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold w-9 text-right ${
                              pct >= 90 ? "text-green-600" :
                              pct >= 75 ? "text-yellow-600" : "text-red-600"
                            }`}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />≥90% Good</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />75–89% Average</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />&lt;75% Poor</div>
                <span className="ml-auto text-gray-400">Present + Late counted as attended</span>
              </div>
            </div>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Today's Attendance</h2>
            <Link href="/admin/attendance" className="text-blue-600 text-sm hover:underline">
              View all →
            </Link>
          </div>

          {recentAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No records for today yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentAttendance.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-gray-900">{r.userId?.name}</p>
                          <p className="text-xs text-gray-500">{r.userId?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{r.userId?.department || "—"}</td>
                      <td className="py-3 text-gray-600">{r.time}</td>
                      <td className="py-3">
                        <span className={r.status === "present" ? "badge-present" : "badge-late"}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <a href={r.photo} target="_blank" rel="noreferrer">
                          <img src={r.photo} alt="photo" className="w-10 h-10 rounded-lg object-cover" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminStatCard({ title, value, icon, color }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
