const mongoose = require("mongoose");

// Cache the connection across serverless function invocations so we don't
// open a new connection on every request (Vercel serverless cold starts).
let cached = global._mongooseConnection;
if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        bufferCommands: false,
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // allow retry on next request
    throw error; // let the route handler return 500
  }

  return cached.conn;
};

module.exports = connectDB;
