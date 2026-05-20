import { addDays, isSameDay, parseISO } from 'date-fns';

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  totalMinutes: number;
}

export interface AgendaSchedule {
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  workingDays: number[];
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function dayLabel(dayIndex: number): string {
  return DAY_LABELS[dayIndex] ?? '';
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function parseAgendaSchedule(settings: Record<string, string>): AgendaSchedule {
  const startTime = settings['working_hours_start'] ?? '08:00';
  const endTime = settings['working_hours_end'] ?? '19:00';
  let startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);
  if (endMinutes <= startMinutes) endMinutes = startMinutes + 60;

  const slotMinutes = Math.max(15, parseInt(settings['default_appointment_duration'] ?? '30', 10) || 30);
  const raw = settings['working_days'] ?? '1,2,3,4,5';
  const workingDays = raw
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 6);

  return {
    startMinutes,
    endMinutes,
    slotMinutes,
    workingDays: workingDays.length ? workingDays : [1, 2, 3, 4, 5],
    startTime,
    endTime,
  };
}

export function generateTimeSlots(schedule: AgendaSchedule): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let t = schedule.startMinutes; t < schedule.endMinutes; t += schedule.slotMinutes) {
    const hour = Math.floor(t / 60);
    const minute = t % 60;
    slots.push({
      hour,
      minute,
      totalMinutes: t,
      label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    });
  }
  return slots;
}

export function isWorkingDay(date: Date, schedule: AgendaSchedule): boolean {
  return schedule.workingDays.includes(date.getDay());
}

export function getDaysInWeek(weekStart: Date, schedule: AgendaSchedule): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) =>
    isWorkingDay(d, schedule),
  );
}

export function appointmentInSlot(
  apt: { scheduledAt: string },
  day: Date,
  slot: TimeSlot,
  slotMinutes: number,
): boolean {
  const d = parseISO(apt.scheduledAt);
  if (!isSameDay(d, day)) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= slot.totalMinutes && mins < slot.totalMinutes + slotMinutes;
}

export function slotRowHeight(slotMinutes: number): number {
  if (slotMinutes <= 15) return 56;
  if (slotMinutes <= 30) return 76;
  return 92;
}

export function datetimeLocalBounds(date: Date, schedule: AgendaSchedule): { min: string; max: string } {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const [sh, sm] = schedule.startTime.split(':');
  const [eh, em] = schedule.endTime.split(':');
  const endHour = parseInt(eh, 10);
  const endMin = Math.max(0, parseInt(em, 10) - schedule.slotMinutes);
  return {
    min: `${y}-${mo}-${d}T${sh}:${sm ?? '00'}`,
    max: `${y}-${mo}-${d}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
  };
}

export function slotDateTime(day: Date, slot: TimeSlot): Date {
  const d = new Date(day);
  d.setHours(slot.hour, slot.minute, 0, 0);
  return d;
}

export function isDateTimeInPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function formatDateTimeLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

/** Mínimo para datetime-local: ahora o inicio de agenda del día elegido, el que sea mayor. */
export function minDateTimeForBooking(schedule: AgendaSchedule, dateTimeValue?: string): string {
  const nowStr = formatDateTimeLocal(new Date());
  if (!dateTimeValue) return nowStr;
  const dayPart = dateTimeValue.split('T')[0];
  const dayDate = new Date(`${dayPart}T12:00:00`);
  const bounds = datetimeLocalBounds(dayDate, schedule);
  const todayPart = nowStr.split('T')[0];
  if (dayPart === todayPart) {
    return nowStr > bounds.min ? nowStr : bounds.min;
  }
  return bounds.min;
}

export function shiftToWorkingDay(date: Date, schedule: AgendaSchedule, direction: 1 | -1): Date {
  let d = addDays(date, direction);
  for (let i = 0; i < 14 && !isWorkingDay(d, schedule); i++) {
    d = addDays(d, direction);
  }
  return d;
}
