export const DAY_COLORS = [
  '#2f6f9f',
  '#3f8f5f',
  '#c97b1f',
  '#7a4f9c',
  '#b4443c',
  '#2f8f8f',
  '#6f7f2f',
  '#1f5f7f',
  '#8f3f6f',
  '#7f4a2f',
];

export const UNASSIGNED_DAY_COLOR = '#6f6f6f';

export const dayColor = (dayIndex) =>
  dayIndex === null || dayIndex === undefined ? UNASSIGNED_DAY_COLOR : DAY_COLORS[dayIndex % DAY_COLORS.length];
