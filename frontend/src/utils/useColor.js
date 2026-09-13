const PALETTE = ['#5b8fa8', '#8ca882', '#7a9e6b', '#a8756b', '#8b7aa8', '#6b9ea8', '#a89a6b', '#9e6b8b'];

export const colorForUser = (userId) => {
  if (!userId) return PALETTE[0];

  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};
