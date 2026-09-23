const PALETTE = [
  '#832129',
  '#bd580f',
  '#836f21',
  '#21833b',
  '#218379',
  '#215883',
  '#452183',
  '#83215f',
];

export const colorForUser = (userId) => {
  if (!userId) return PALETTE[0];

  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};
