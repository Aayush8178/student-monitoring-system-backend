const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const OPEN = 9 * 60;
const CLOSE = 18 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 13 * 60 + 30;
const shortDay = day => DAYS.find(d => d.slice(0, 3).toLowerCase() === String(day).trim().slice(0, 3).toLowerCase());
const minutes = time => /^\d{2}:\d{2}$/.test(String(time)) && Number(time.slice(0,2)) < 24 && Number(time.slice(3)) < 60 ? Number(time.slice(0,2)) * 60 + Number(time.slice(3)) : NaN;
const dateValid = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
const dateAfter = date => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0,10);
const indiaDate = value => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
};
function validClass(entry) {
  const start = minutes(entry?.time);
  const duration = Number(entry?.duration);
  const end = start + duration;
  return typeof entry?.subject === 'string' && entry.subject.trim().length > 0 && entry.subject.length <= 160 && DAYS.includes(entry.day) && Number.isInteger(duration) && duration > 0 && start >= OPEN && end <= CLOSE && !(start < LUNCH_END && end > LUNCH_START);
}
function validateSchedule(schedule) {
  if (!Array.isArray(schedule) || schedule.length > 100) throw new Error('Provide no more than 100 weekly classes.');
  const normalized = schedule.map((entry, index) => {
    const result = { subject: String(entry?.subject || '').trim(), day: shortDay(entry?.day), time: String(entry?.time || '').padStart(5, '0'), duration: Number(entry?.duration) };
    if (!validClass(result)) throw new Error('Class ' + (index + 1) + ': use Monday–Friday, 09:00–18:00, a valid duration, and no overlap with lunch (13:00–13:30).');
    return result;
  }).sort((a,b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || minutes(a.time) - minutes(b.time));
  for (let i = 1; i < normalized.length; i++) {
    const previous = normalized[i-1], current = normalized[i];
    if (previous.day === current.day && minutes(previous.time) + previous.duration > minutes(current.time)) throw new Error('Overlapping classes on ' + current.day + '. Correct the timetable before planning.');
  }
  return normalized;
}
function validatePreferences(input) {
  const targetAttendance = Number(input.targetAttendance);
  const maxClassesPerDay = Number(input.maxClassesPerDay);
  if (!Number.isFinite(targetAttendance) || targetAttendance <= 0 || targetAttendance > 100) throw new Error('Attendance target must be greater than 0 and at most 100.');
  if (!Number.isInteger(maxClassesPerDay) || maxClassesPerDay < 1 || maxClassesPerDay > 12) throw new Error('Daily class limit must be between 1 and 12.');
  if (!dateValid(input.semesterStart) || !dateValid(input.semesterEnd) || input.semesterEnd < input.semesterStart) throw new Error('Enter valid semester start and end dates.');
  if ((Date.parse(input.semesterEnd) - Date.parse(input.semesterStart)) / 86400000 > 370) throw new Error('The semester period cannot exceed 370 days.');
  if (!input.availability || typeof input.availability !== 'object') throw new Error('Set your weekday availability.');
  const availability = {};
  for (const day of DAYS) {
    const value = input.availability[day.slice(0,3)];
    if (!value || value.enabled === false) { availability[day.slice(0,3)] = {enabled:false,start:'09:00',end:'18:00'}; continue; }
    const start = minutes(value.start), end = minutes(value.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < OPEN || end > CLOSE || start >= end || (start >= LUNCH_START && end <= LUNCH_END)) throw new Error(day + ': choose a valid window between 09:00 and 18:00, with time outside lunch.');
    availability[day.slice(0,3)] = {enabled:true,start:value.start,end:value.end};
  }
  if (!Object.values(availability).some(value => value.enabled)) throw new Error('Select at least one available weekday.');
  return { targetAttendance, maxClassesPerDay, semesterStart:input.semesterStart, semesterEnd:input.semesterEnd, availability, preferredDays:Object.entries(availability).filter(([,v])=>v.enabled).map(([day])=>day), availableSlots:'all', focusSubjects:[] };
}
module.exports = { DAYS, OPEN, CLOSE, LUNCH_START, LUNCH_END, minutes, dateValid, dateAfter, indiaDate, validClass, validateSchedule, validatePreferences };
