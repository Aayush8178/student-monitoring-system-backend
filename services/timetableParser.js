const { DAYS, validateSchedule } = require('./schedulePolicy');
const ALL_DAYS = [...DAYS, 'Saturday', 'Sunday'];
const dayPattern = /\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const canonicalDay = value => ALL_DAYS.find(day => day.toLowerCase().slice(0,3) === String(value).trim().toLowerCase().slice(0,3));
function parseTime(value) {
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minute = Math.round(value * 1440);
    return String(Math.floor(minute / 60)).padStart(2,'0') + ':' + String(minute % 60).padStart(2,'0');
  }
  const match = String(value ?? '').trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\.?$|^(\d{1,2})(?:[:.](\d{2}))?$/i);
  if (!match) return null;
  let hour = Number(match[1] ?? match[4]);
  const minute = Number(match[2] ?? match[5] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) return null;
  if (meridiem) hour = hour % 12 + (meridiem === 'p' ? 12 : 0);
  // College timetables often write afternoon hours as 1:30–5:30 without PM.
  else if (hour >= 1 && hour <= 6) hour += 12;
  return String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0');
}
const toMinutes = time => Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
function range(value) {
  const parts = String(value ?? '').trim().split(/\s*(?:[-–—]|\bto\b)\s*/i);
  const start = parseTime(parts[0]);
  const end = parts.length > 1 ? parseTime(parts[1]) : null;
  return {time:start,duration:start && end ? toMinutes(end)-toMinutes(start) : 60};
}
class TimetableParser {
  static async parseFile(buffer, mimetype) {
    if (!buffer?.length) throw new Error('No file content found');
    if (/spreadsheet|excel|csv/.test(mimetype)) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, {type:'buffer'});
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1,defval:''});
      return this.extractRows(rows);
    }
    let text;
    if (mimetype === 'application/pdf') {
      // Load PDF support only for PDF uploads, not during server/login startup.
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({data:buffer});
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = (await require('mammoth').extractRawText({buffer})).value;
    } else throw new Error('Use a text PDF, DOCX, CSV or Excel file. Images/scanned PDFs can be reviewed and entered manually.');
    return this.extractScheduleFromText(text);
  }
  static extractRows(rows) {
    const headerIndex = rows.findIndex(row => row.some(cell => /^(day|weekday|subject|course)$/i.test(String(cell).trim())));
    if (headerIndex < 0) throw new Error('No table header found. Use Day, Subject, Time and Duration columns, or a Day column with time-range headings.');
    const headers = rows[headerIndex].map(cell => String(cell).trim().toLowerCase());
    const find = names => headers.findIndex(h => names.includes(h));
    const dayIndex = find(['day','weekday']);
    const subjectIndex = find(['subject','course','subject name']);
    const timeIndex = find(['time','start','start time']);
    const endIndex = find(['end','end time']);
    const durationIndex = find(['duration','duration (minutes)','minutes']);
    if (dayIndex < 0) throw new Error('A Day or Weekday column is required.');
    const schedule = [];
    for (const row of rows.slice(headerIndex+1)) {
      const day = canonicalDay(row[dayIndex]);
      if (!day) continue;
      if (subjectIndex >= 0 && timeIndex >= 0) {
        const subject = String(row[subjectIndex] ?? '').trim();
        if (!subject || /^(lunch|break|free)$/i.test(subject)) continue;
        const parsed = typeof row[timeIndex] === 'number' ? {time:parseTime(row[timeIndex]),duration:60} : range(row[timeIndex]);
        let duration = parsed.duration;
        if (endIndex >= 0 && row[endIndex] !== '') { const end = parseTime(row[endIndex]); duration = parsed.time && end ? toMinutes(end)-toMinutes(parsed.time) : NaN; }
        else if (durationIndex >= 0 && row[durationIndex] !== '') duration = Number(row[durationIndex]);
        if (!parsed.time || !Number.isFinite(duration) || duration <= 0) throw new Error('Invalid time or duration for ' + subject + '. Use HH:MM and duration in minutes.');
        schedule.push({subject,day,time:parsed.time,duration});
      } else {
        headers.forEach((header,index) => {
          if (index === dayIndex) return;
          const subject = String(row[index] ?? '').trim();
          if (!subject || /^(lunch|break|free|[-–—])$/i.test(subject)) return;
          const parsed = range(header);
          if (!parsed.time) throw new Error('Unrecognized time-column heading: ' + header);
          schedule.push({subject,day,...parsed});
        });
      }
    }
    return schedule;
  }
  static extractScheduleFromText(text) {
    const schedule = [];
    const timePattern = /\b\d{1,2}(?::\d{2}|\.\d{2})\s*(?:[ap]\.?m\.?)?/gi;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const dayMatch = raw.match(dayPattern);
      if (!dayMatch) continue;
      const times = [...raw.matchAll(timePattern)];
      // Ambiguous grid rows must be reviewed manually; never guess their layout.
      if (!times.length || times.length > 2) continue;
      const time = parseTime(times[0][0]);
      const end = times[1] ? parseTime(times[1][0]) : null;
      const subject = raw.replace(dayPattern,'').replace(timePattern,'').replace(/\bto\b/gi,' ').replace(/^[\s|,:;–—-]+|[\s|,:;–—-]+$/g,'').trim();
      if (!subject || /^(lunch|break|free)$/i.test(subject) || !time) continue;
      const duration = end ? toMinutes(end)-toMinutes(time) : 60;
      if (duration <= 0) continue;
      schedule.push({subject,day:canonicalDay(dayMatch[0]),time,duration});
    }
    return schedule;
  }
  static isValidScheduleEntry(entry) {
    try { validateSchedule([entry]); return true; } catch { return false; }
  }
}
module.exports = TimetableParser;
