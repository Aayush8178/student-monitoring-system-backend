const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../controllers/authController');

const {
  uploadTimetable,
  getTimetable,
  getMyTimetable,
  updateTimetable,
  deleteTimetable,
  getAllTimetables
} = require('../controllers/timetableController');

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const types = {
      '.pdf':'application/pdf',
      '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls':'application/vnd.ms-excel',
      '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv':'text/csv',
    };
    const extension = require('path').extname(file.originalname).toLowerCase();
    if (!types[extension]) return cb(new Error('Use a text PDF, DOCX, CSV, XLS or XLSX file. Images can be entered using the manual editor.'));
    // Browsers may send CSV/Excel as text/plain or application/octet-stream.
    // The selected parser still validates the file content; never execute it.
    file.mimetype = types[extension];
    cb(null, true);
  }
});

/**
 * Upload timetable for a student
 * POST /api/timetable/upload
 * Admin only
 */
router.post(
  '/upload',
  authMiddleware(['admin', 'student']),
  upload.single('file'),
  uploadTimetable
);

/**
 * Get student's own timetable
 * GET /api/timetable/my
 * Student access
 */
router.get(
  '/my',
  authMiddleware(['student']),
  getMyTimetable
);

/**
 * Get all timetables (admin only)
 * GET /api/timetable
 */
router.get(
  '/',
  authMiddleware(['admin']),
  getAllTimetables
);

/**
 * Get timetable for specific student
 * GET /api/timetable/:studentId
 */
const requireOwnTimetable = (req, res, next) => {
  if (req.user.role === 'student' && String(req.user.studentId) !== req.params.studentId) {
    return res.status(403).json({ message: 'You can only access your own timetable' });
  }
  next();
};

router.get(
  '/:studentId',
  authMiddleware(['admin', 'student']),
  requireOwnTimetable,
  getTimetable
);

/**
 * Update timetable schedule
 * PUT /api/timetable/:studentId
 * Admin only
 */
router.put(
  '/:studentId',
  authMiddleware(['admin', 'student']),
  requireOwnTimetable,
  updateTimetable
);

/**
 * Delete timetable
 * DELETE /api/timetable/:studentId
 * Admin only
 */
router.delete(
  '/:studentId',
  authMiddleware(['admin']),
  deleteTimetable
);

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
