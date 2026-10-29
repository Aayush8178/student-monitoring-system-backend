const { User, Student } = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// signup function
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;

    let linkedStudentId = null;

    if (role === "student") {
      if (!studentId) {
        return res.status(400).json({ error: "studentId is required for students" });
      }

      const studentExists = await Student.findById(studentId);
      if (!studentExists) {
        return res.status(404).json({ error: "Student not found" });
      }

      linkedStudentId = studentId;
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "student",
      studentId: linkedStudentId,
    });

    res.json({ message: "User registered", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim();
    let user = await User.findOne({ email: normalizedEmail });
    // Preserve existing mixed-case accounts without changing stored passwords.
    if (!user) {
      const matches = await User.find({ email: normalizedEmail }).collation({ locale:'en', strength:2 }).limit(2);
      if (matches.length === 1) user = matches[0];
    }
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role, studentId: user.studentId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// middleware
exports.authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "No token provided" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
};
