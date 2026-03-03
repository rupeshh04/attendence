"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { getAllAttendance, exportAttendance, getEmployees, updateAttendance, deleteAttendance } from "../../../utils/api";

export default function AdminAttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit modal state
  const [editRecord, setEditRecord] = useState(null); // record being edited
  const [editForm, setEditForm] = useState({ status: "", time: "", date: "" });
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState(null);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [filters, setFilters] = useState({ date: today, employeeId: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== "admin") { router.push("/dashboard"); return; }
    setUser(parsed);
    fetchEmployees();
    fetchAttendance(1, { date: today, employeeId: "" });
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await getEmployees();
      setEmployees(data);
    } catch (e) {}
  };

  const fetchAttendance = async (page = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (f.date) params.date = f.date;
      if (f.employeeId) params.employeeId = f.employeeId;
      const { data } = await getAllAttendance(params);
      setRecords(data.records);
      setTotal(data.total);
      setCurrentPage(data.page);
      setTotalPages(data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchAttendance(1, filters);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.date) params.date = filters.date;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      const { data } = await exportAttendance(params);
      if (!data.length) { alert("No data to export."); return; }
      const headers = Object.keys(data[0]);
      const rows = data.map((row) =>
        headers.map((h) => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${filters.date || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // ── Edit handlers ────────────────────────────────────────────────────────────
  const openEdit = (record) => {
    setEditRecord(record);
    setEditForm({ status: record.status, time: record.time, date: record.date });
    setEditMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setEditMsg(null);
    try {
      const { data } = await updateAttendance(editRecord._id, editForm);
      setRecords((prev) =>
        prev.map((r) => (r._id === editRecord._id ? data.record : r))
      );
      setEditMsg({ type: "success", text: "Record updated successfully." });
      setTimeout(() => setEditRecord(null), 900);
    } catch (e) {
      setEditMsg({ type: "error", text: e.response?.data?.message || "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAttendance(deleteId);
      setRecords((prev) => prev.filter((r) => r._id !== deleteId));
      setTotal((t) => t - 1);
      setDeleteId(null);
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
            <p className="text-gray-500">{total} records found</p>
          </div>
          <button onClick={handleExportCSV} disabled={exporting} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        {/* Filters */}
        <form onSubmit={handleFilter} className="card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
              <input type="date" value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Employee</label>
              <select value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                className="input-field">
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1">Apply Filters</button>
              <button type="button" onClick={() => {
                const reset = { date: "", employeeId: "" };
                setFilters(reset);
                fetchAttendance(1, reset);
              }} className="btn-secondary">Clear</button>
            </div>
          </div>
        </form>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium">Check-out</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Photos</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-500">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.userId?.name}</p>
                        <p className="text-xs text-gray-500">{r.userId?.email}</p>
                        <p className="text-xs text-gray-400">{r.userId?.department}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{r.date}</td>
                      {/* Check-in */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 font-medium text-sm">{r.time}</p>
                        <a href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5">
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {Number(r.latitude).toFixed(3)},{Number(r.longitude).toFixed(3)}
                        </a>
                      </td>
                      {/* Check-out */}
                      <td className="px-4 py-3">
                        {r.checkoutTime ? (
                          <>
                            <p className="text-gray-700 font-medium text-sm">{r.checkoutTime}</p>
                            <a href={`https://maps.google.com/?q=${r.checkoutLatitude},${r.checkoutLongitude}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {Number(r.checkoutLatitude).toFixed(3)},{Number(r.checkoutLongitude).toFixed(3)}
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not checked out</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      {/* Check-in / Check-out location summary */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                            </svg>
                            In
                          </span>
                          {r.checkoutTime && (
                            <span className="inline-flex items-center gap-1 text-orange-600 font-medium ml-2">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              Out
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Photos: check-in + check-out */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="relative group">
                            <a href={r.photo} target="_blank" rel="noreferrer">
                              <img src={r.photo} alt="check-in"
                                className="w-9 h-9 rounded-lg object-cover hover:opacity-75 transition-opacity border-2 border-green-300"
                                title="Check-in photo" />
                            </a>
                            <span className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                              </svg>
                            </span>
                          </div>
                          {r.checkoutPhoto ? (
                            <div className="relative group">
                              <a href={r.checkoutPhoto} target="_blank" rel="noreferrer">
                                <img src={r.checkoutPhoto} alt="check-out"
                                  className="w-9 h-9 rounded-lg object-cover hover:opacity-75 transition-opacity border-2 border-orange-300"
                                  title="Check-out photo" />
                              </a>
                              <span className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </span>
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit record"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(r._id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete record"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              <button onClick={() => fetchAttendance(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">
                ← Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button onClick={() => fetchAttendance(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Attendance</h2>
                <p className="text-sm text-gray-500 mt-0.5">{editRecord.userId?.name}</p>
              </div>
              <button onClick={() => setEditRecord(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                <input
                  type="time"
                  step="1"
                  value={
                    // convert "09:15:00 AM" → "09:15:00" for the input
                    (() => {
                      try {
                        const d = new Date(`1970-01-01 ${editForm.time}`);
                        return d.toTimeString().slice(0, 8);
                      } catch { return editForm.time; }
                    })()
                  }
                  onChange={(e) => {
                    // convert back to "hh:mm:ss AM/PM"
                    try {
                      const [h, m, s] = e.target.value.split(":");
                      const d = new Date();
                      d.setHours(+h, +m, +(s || 0));
                      const formatted = d.toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      });
                      setEditForm({ ...editForm, time: formatted });
                    } catch { setEditForm({ ...editForm, time: e.target.value }); }
                  }}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Stored as: {editForm.time}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {["present", "late", "absent"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: s })}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 capitalize transition-all ${
                        editForm.status === s
                          ? s === "present"
                            ? "bg-green-500 border-green-500 text-white"
                            : s === "late"
                            ? "bg-yellow-500 border-yellow-500 text-white"
                            : "bg-red-500 border-red-500 text-white"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {s === "present" ? "✅ Present" : s === "late" ? "⏰ Late" : "❌ Absent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              {editMsg && (
                <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
                  editMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {editMsg.text}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t flex gap-3 bg-gray-50">
              <button onClick={() => setEditRecord(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Saving...
                  </>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Record?</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 flex items-center justify-center gap-2">
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "present")
    return <span className="badge-present capitalize">{status}</span>;
  if (status === "late")
    return <span className="badge-late capitalize">{status}</span>;
  return <span className="badge-absent capitalize">{status || "absent"}</span>;
}
