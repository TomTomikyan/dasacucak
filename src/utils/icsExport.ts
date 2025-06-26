export interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  recurrence?: string;
}

export class ICSExporter {
  private static formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private static escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private static createEvent(event: ICSEvent): string {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTART:${this.formatDate(event.startDate)}`,
      `DTEND:${this.formatDate(event.endDate)}`,
      `SUMMARY:${this.escapeText(event.summary)}`,
      `DESCRIPTION:${this.escapeText(event.description)}`,
      `LOCATION:${this.escapeText(event.location)}`,
    ];

    if (event.recurrence) {
      lines.push(`RRULE:${event.recurrence}`);
    }

    lines.push('END:VEVENT');
    return lines.join('\r\n');
  }

  static generateICS(events: ICSEvent[], calendarName: string = 'College Schedule'): string {
    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//College Schedule Generator//EN',
      `X-WR-CALNAME:${this.escapeText(calendarName)}`,
      'X-WR-TIMEZONE:Europe/Moscow',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ].join('\r\n');

    const footer = 'END:VCALENDAR';

    const eventStrings = events.map(event => this.createEvent(event));

    return [header, ...eventStrings, footer].join('\r\n');
  }

  static downloadICS(content: string, filename: string = 'schedule.ics'): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}