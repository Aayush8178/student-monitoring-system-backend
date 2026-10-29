const TimetableParser = require('../services/timetableParser');
const { Timetable, Student } = require('../db');

/**
 * Timetable Controller
 * Handles timetable upload, parsing, and management
 */

/**
 * Upload and parse timetable for a student
 * POST /api/timetable/upload
 */
const uploadTimetable = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const studentId = req.user.role === 'student' ? req.user.studentId : req.body.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Parse the file
    const parsedSchedule = await TimetableParser.parseFile(
      req.file.buffer,
      req.file.mimetype
    );

    if (parsedSchedule.length === 0) {
      return res.status(400).json({
        message: 'Could not read this layout. For images/scanned PDFs, use the manual editor. For Excel, use Day, Subject, Time and Duration columns.'
      });
    }

    // Parsing is a review step. Persist only after the student confirms edits.
    res.json({
      message:'Review the extracted classes and save your timetable.',
      requiresReview:true,
      timetable:{studentId,schedule:parsedSchedule},
      scheduleParsed:parsedSchedule.length,
    });
  } catch (err) {
    console.error('Timetable upload error:', err);
    res.status(400).json({
      message: err.message || 'Failed to upload timetable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Get timetable for a specific student
 * GET /api/timetable/:studentId
 */
const getTimetable = async (req, res) => {
  try {
    const { studentId } = req.params;

    const timetable = await Timetable.findOne({ studentId }).populate('studentId');

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found for this student' });
    }

    res.json(timetable);
  } catch (err) {
    console.error('Get timetable error:', err);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
};

/**
 * Get current logged-in student's timetable
 * GET /api/timetable/me
 */
const getMyTimetable = async (req, res) => {
  try {
    const studentId = req.user.studentId; // From auth middleware

    const timetable = await Timetable.findOne({ studentId }).populate('studentId');

    if (!timetable) {
      return res.status(404).json({ 
        message: 'Your timetable has not been uploaded yet',
        timetable: null
      });
    }

    res.json(timetable);
  } catch (err) {
    console.error('Get my timetable error:', err);
    res.status(500).json({ message: 'Failed to fetch your timetable' });
  }
};

/**
 * Update schedule manually (correction after auto-parse)
 * PUT /api/timetable/:studentId
 */
const updateTimetable = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schedule } = req.body;

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ message: 'Schedule must be an array' });
    }

    let validated;
    try { validated = require('../services/schedulePolicy').validateSchedule(schedule); }
    catch (error) { return res.status(400).json({ message:error.message }); }
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message:'Student profile not found' });

    let timetable = await Timetable.findOne({ studentId });

    if (!timetable) {
      timetable = new Timetable({
        studentId,
        schedule: validated
      });
    } else {
      timetable.schedule = validated;
    }

    await timetable.save();

    res.json({
      message: 'Timetable updated successfully',
      timetable
    });
  } catch (err) {
    console.error('Update timetable error:', err);
    res.status(500).json({ message: 'Failed to update timetable' });
  }
};

/**
 * Delete timetable
 * DELETE /api/timetable/:studentId
 */
const deleteTimetable = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await Timetable.findOneAndDelete({ studentId });

    if (!result) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    res.json({ message: 'Timetable deleted successfully' });
  } catch (err) {
    console.error('Delete timetable error:', err);
    res.status(500).json({ message: 'Failed to delete timetable' });
  }
};

/**
 * Get all timetables (admin only)
 * GET /api/timetable
 */
const getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find()
      .populate('studentId', 'name email attendancePercentage');

    res.json(timetables);
  } catch (err) {
    console.error('Get all timetables error:', err);
    res.status(500).json({ message: 'Failed to fetch timetables' });
  }
};

module.exports = {
  uploadTimetable,
  getTimetable,
  getMyTimetable,
  updateTimetable,
  deleteTimetable,
  getAllTimetables
};
