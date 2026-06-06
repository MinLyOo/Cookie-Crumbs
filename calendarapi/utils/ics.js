function toIcsDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split(' ')
  const datePart = parts[0].replace(/-/g, '')
  if (parts.length > 1) {
    let timePart = parts[1].replace(/:/g, '')
    if (timePart.length === 4) timePart += '00'
    return datePart + 'T' + timePart
  }
  return datePart
}

function escapeIcs(str) {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

function generateIcs(activities, host) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cookie Crumbs//Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Cookie Crumbs 活动日历',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Shanghai',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n')

  const events = activities.map(activity => {
    return [
      'BEGIN:VEVENT',
      'UID:activity-' + activity.id + '@icookie.top',
      'DTSTART;TZID=Asia/Shanghai:' + toIcsDate(activity.start_date),
      'DTEND;TZID=Asia/Shanghai:' + toIcsDate(activity.end_date),
      'SUMMARY:' + escapeIcs(activity.title),
      'DESCRIPTION:' + escapeIcs(activity.description),
      'DTSTAMP:' + dtstamp,
      'END:VEVENT',
    ].join('\r\n')
  }).join('\r\n')

  return header + '\r\n' + events + '\r\n' + 'END:VCALENDAR'
}

module.exports = { generateIcs, toIcsDate, escapeIcs }
