const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const studentRoutes = require("./routes/studentsRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const feeRoutes = require("./routes/feeRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes"); // ✅ new

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/' , (req,res)=>{
  res.json({
    message : "you are on the home page "
  })
})
app.use("/api/auth", authRoutes);          // ✅ Login & Signup
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/alerts", alertRoutes);

// Async function to start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // Exit if DB connection fails
  }
};

startServer();
