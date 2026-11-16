export const TRIP_NAME_MAX = 200;
export const TRIP_DESCRIPTION_MAX = 1000;

const MS_PER_DAY = 86_400_000;
const MAX_DAYS = 366;
const FIELDS = ['name', 'description', 'startDate', 'endDate'];

const rangeFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const dayFormatter = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const parseDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};

export const emptyTripForm = { name: '', description: '', startDate: '', endDate: '' };

export const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export const tripToForm = (trip) => ({
  name: trip?.name ?? '',
  description: trip?.description ?? '',
  startDate: toDateInput(trip?.startDate),
  endDate: toDateInput(trip?.endDate),
});

export const formToPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  startDate: form.startDate || null,
  endDate: form.endDate || null,
});

export const isSameForm = (a, b) => FIELDS.every((key) => (a[key] ?? '') === (b[key] ?? ''));

export const countDays = (startDate, endDate) => {
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (start === null || end === null || end < start) return 0;
  return Math.round((end - start) / MS_PER_DAY) + 1;
};

export const validateTripForm = (form, { datesRequired = false } = {}) => {
  const errors = {};
  const name = form.name.trim();

  if (!name) errors.name = 'Podaj nazwę wyprawy.';
  else if (name.length > TRIP_NAME_MAX) errors.name = `Nazwa może mieć najwyżej ${TRIP_NAME_MAX} znaków.`;

  if (form.description.length > TRIP_DESCRIPTION_MAX) {
    errors.description = `Opis może mieć najwyżej ${TRIP_DESCRIPTION_MAX} znaków.`;
  }

  const hasStart = Boolean(form.startDate);
  const hasEnd = Boolean(form.endDate);

  if (datesRequired && (!hasStart || !hasEnd)) errors.dates = 'Ustaw datę początku i końca.';
  else if (hasStart !== hasEnd) errors.dates = 'Ustaw obie daty albo zostaw obie puste.';
  else if (hasStart && parseDay(form.endDate) < parseDay(form.startDate)) {
    errors.dates = 'Data końca nie może być wcześniejsza niż początek.';
  } else if (hasStart && countDays(form.startDate, form.endDate) > MAX_DAYS) {
    errors.dates = `Wyprawa może trwać najwyżej ${MAX_DAYS} dni.`;
  }

  return errors;
};

export const formatRange = (startDate, endDate) => {
  const start = parseDay(startDate);
  const end = parseDay(endDate);

  if (start !== null && end !== null && end >= start) {
    return rangeFormatter.formatRange(new Date(start), new Date(end)).replace(/\s*\u2013\s*/g, ' - ');
  }
  if (start !== null) return `od ${rangeFormatter.format(new Date(start))}`;
  if (end !== null) return `do ${rangeFormatter.format(new Date(end))}`;
  return '';
};

export const describeWhen = (startDate, endDate) => {
  const start = parseDay(startDate);
  if (start === null) return 'Bez terminu';

  const end = parseDay(endDate) ?? start;
  const today = todayUtc();

  if (today > end) return 'Zakończona';
  if (today >= start) return 'Trwa teraz';

  const daysLeft = Math.round((start - today) / MS_PER_DAY);
  return daysLeft === 1 ? 'Jutro' : `Za ${daysLeft} dni`;
};

export const getTiming = (startDate, endDate) => {
  const start = parseDay(toDateInput(startDate));
  if (start === null) return { phase: 'undated', start: null, end: null, daysUntil: null };

  const end = parseDay(toDateInput(endDate)) ?? start;
  const today = todayUtc();

  if (today > end) return { phase: 'past', start, end, daysUntil: null };
  if (today >= start) return { phase: 'ongoing', start, end, daysUntil: 0 };
  return { phase: 'upcoming', start, end, daysUntil: Math.round((start - today) / MS_PER_DAY) };
};

export const listDays = (startDate, endDate) => {
  const total = Math.min(countDays(startDate, endDate), MAX_DAYS);
  const start = parseDay(startDate);

  return Array.from({ length: total }, (_, index) => ({
    index,
    label: dayFormatter.format(new Date(start + index * MS_PER_DAY)),
  }));
};
