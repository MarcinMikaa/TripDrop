export const MAX_PUBLICATION_TAGS = 5;

export const PUBLICATION_TAGS = [
  { key: 'city', label: 'Miasto' },
  { key: 'mountains', label: 'Góry' },
  { key: 'sea', label: 'Morze' },
  { key: 'lakes', label: 'Jeziora' },
  { key: 'nature', label: 'Przyroda' },
  { key: 'heritage', label: 'Zabytki' },
  { key: 'food', label: 'Kulinarnie' },
  { key: 'active', label: 'Aktywnie' },
  { key: 'relax', label: 'Relaks' },
  { key: 'kids', label: 'Z dziećmi' },
  { key: 'dogs', label: 'Z psem' },
  { key: 'budget', label: 'Budżetowo' },
];

export const PUBLICATION_TAG_LABELS = Object.fromEntries(PUBLICATION_TAGS.map((tag) => [tag.key, tag.label]));
