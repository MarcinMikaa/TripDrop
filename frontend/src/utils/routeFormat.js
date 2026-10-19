// TODO: DayRoutes (kolega) ma własną kopię z kropką zamiast przecinka - przepiąć na ten plik
export const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString('pl-PL', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
};

export const formatDuration = (seconds) => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};
