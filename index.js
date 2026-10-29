const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const studentRoutes = require("./routes/studentsRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const feeRoutes = require("./routes/feeRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes"); 
const timetableRoutes = require("./routes/timetableRoutes");
const schedulerRoutes = require("./routes/schedulerRoutes");
const predictionRoutes = require("./routes/predictionRoutes"); 

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// just to test initially 
app.get("/", (req, res) => {
  res.json({ message: "you are on the home page" });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/analytics", analyticsRoutes); 
app.use("/api/timetable", timetableRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/prediction", predictionRoutes); 

// calling server
const startServer = async () => {
  try {
    if (!process.env.MONGO_URL || !process.env.JWT_SECRET) {
      throw new Error("Set MONGO_URL and JWT_SECRET in BACKEND/.env before starting the server.");
    }
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

startServer();
