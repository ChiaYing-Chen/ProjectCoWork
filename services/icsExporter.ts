import { Project } from '../types';
import { format } from 'date-fns';
import { addDays } from 'date-fns/addDays';

const formatDateForIcs = (date: Date): string => {
  return format(date, 'yyyyMMdd');
};

export const exportProjectToIcs = (project: Project): string => {
  const events = project.tasks.map(task => {
    const uid = `${task.id}-${project.id}@project-scheduler.app`;
    const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const dtstart = `DTSTART;VALUE=DATE:${formatDateForIcs(task.start)}`;
    // 對於全天事件，iCalendar 的 DTEND 應為結束日的後一天
    const dtend = `DTEND;VALUE=DATE:${formatDateForIcs(addDays(task.end, 1))}`;
    const summary = `SUMMARY:${task.name}`;
    const description = task.notes ? `DESCRIPTION:${task.notes.replace(/\n/g, '\\n')}` : '';

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      dtstart,
      dtend,
      summary,
      description,
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  }).join('\r\n');

  const calendarContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//ProjectScheduler//${project.name}//EN`,
    `X-WR-CALNAME:${project.name}`,
    events,
    'END:VCALENDAR'
  ].join('\r\n');
  
  return calendarContent;
};
