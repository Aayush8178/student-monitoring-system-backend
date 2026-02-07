const mongoose = require("mongoose");

// Student
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: String,
  guardian: String, // guardian email

  // Attendance summary
  totalClasses: { type: Number, default: 0 },
  attendedClasses: { type: Number, default: 0 },
  attendancePercentage: { type: Number, default: 100 },

  // Assessment summary
  totalTests: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 }
}, { timestamps: true });



// Attendance
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  subject: String,
  date: Date,
  status: { type: String, enum: ["present", "absent"] }
}, { timestamps: true });

// Assessment
const assessmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  subject: String,
  testDate: Date,
  score: Number,
  attempt: Number
}, { timestamps: true });

// Fee
const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  dueDate: Date,
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  amount: Number
}, { timestamps: true });

// Alert
const alertSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  reason: String,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "sent"], default: "pending" }
}, { timestamps: true });


const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // hashed
  role: { type: String, enum: ["admin", "student"], default: "student" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" } // only for student users
});

const User = mongoose.model("User", userSchema);
const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const Assessment = mongoose.model("Assessment", assessmentSchema);
const Fee = mongoose.model("Fee", feeSchema);
const Alert = mongoose.model("Alert", alertSchema);

module.exports = { Student, Attendance, Assessment, Fee, Alert, User };