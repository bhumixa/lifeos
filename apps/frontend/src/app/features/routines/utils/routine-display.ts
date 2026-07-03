/** Minutes since midnight for a "HH:mm" time-of-day string. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** "07:05" -> "7:05 AM" — friendlier for display than the raw 24-hour storage format. */
export function formatTimeOfDay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const reference = new Date();
  reference.setHours(hours, minutes, 0, 0);
  return reference.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** 95 -> "1h 35m"; 45 -> "45m"; 0 -> "0m". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
