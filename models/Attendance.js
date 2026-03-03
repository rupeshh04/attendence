const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // stored as "YYYY-MM-DD"
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    photo: {
      type: String, // Cloudinary URL or base64
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent"],
      default: "present",
    },
    locationName: {
      type: String,
      default: "",
    },
    // ── Checkout fields ──────────────────────────────────────
    checkoutTime: {
      type: String,
      default: null,
    },
    checkoutPhoto: {
      type: String,
      default: null,
    },
    checkoutLatitude: {
      type: Number,
      default: null,
    },
    checkoutLongitude: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate attendance per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
