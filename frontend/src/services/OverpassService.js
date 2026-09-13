const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_S = 25;
const MAX_RESULTS = 250;

export const POI_MIN_ZOOM = 13;

export const POI_CATEGORIES = {
  food: {
    label: 'Gastronomia',
    color: '#d84315',
    icon: 'cutlery',
  },
  lodging: {
    label: 'Nocleg',
    color: '#1565c0',
    icon: 'bed',
  },
  attraction: {
    label: 'Atrakcja',
    color: '#6a1b9a',
    icon: 'camera',
  },
  nature: {
    label: 'Przyroda',
    color: '#00796b',
    icon: 'tree',
  },
  transport: {
    label: 'Transport',
    color: '#2e7d32',
    icon: 'bus',
  },
  practical: {
    label: 'Punkt praktyczny',
    color: '#5d4037',
    icon: 'info',
  },
};

export const AREA_SEARCH_CATEGORIES = [
  'food',
  'lodging',
  'attraction',
  'nature',
  'transport',
];

const CATEGORY_FILTERS = {
  food: [
    '["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream)$"]["name"]',
  ],
  lodging: [
    '["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|camp_site|caravan_site|alpine_hut|wilderness_hut)$"]["name"]',
  ],
  attraction: [
    '["tourism"~"^(museum|attraction|viewpoint|artwork|gallery|theme_park|zoo)$"]["name"]',
    '["historic"~"^(monument|memorial|castle|ruins|church|city_gate|tower)$"]["name"]',
  ],
  nature: [
    '["natural"~"^(peak|beach)$"]["name"]',
    '["leisure"="park"]["name"]',
  ],
  transport: [
    '["railway"~"^(station|halt)$"]["name"]',
    '["amenity"~"^(bus_station|parking)$"]["name"]',
  ],
  practical: [
    '["amenity"~"^(shelter|drinking_water|toilets)$"]',
    '["tourism"="picnic_site"]',
  ],
};

const POI_SEARCH_TERMS = {
  food: [
    'restauracje', 'restauracja', 'jedzenie', 'gastronomia', 'jedzenia',
    'kawiarnie', 'kawiarnia', 'bary', 'bar', 'pub', 'puby', 'fast food',
    'restaurants', 'food',
  ],
  lodging: [
    'hotele', 'hotel', 'noclegi', 'nocleg', 'hostele', 'hostel',
    'pensjonaty', 'pensjonat', 'apartamenty', 'kempingi', 'kemping',
    'pole namiotowe', 'schroniska', 'schronisko', 'hotels',
  ],
  attraction: [
    'atrakcje', 'atrakcja', 'zabytki', 'zabytek', 'muzea', 'muzeum',
    'punkty widokowe', 'punkt widokowy', 'galerie', 'galeria', 'zwiedzanie',
    'attractions',
  ],
  nature: [
    'gory', 'góry', 'szczyty', 'szczyt',
    'plaze', 'plaża', 'plaże', 'plaz',
    'parki', 'park',
  ],
  transport: [
    'transport', 'dworce', 'dworzec', 'stacje', 'stacja',
    'parkingi', 'parking', 'przystanki', 'przystanek',
  ],
  practical: [
    'toalety', 'toaleta', 'woda', 'woda pitna', 'wiaty', 'wiata',
    'schrony', 'miejsca postojowe', 'praktyczne',
  ],
};

const FOOD_VALUES = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream'];
const LODGING_VALUES = [
  'hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'chalet',
  'camp_site', 'caravan_site', 'alpine_hut', 'wilderness_hut',
];
const ATTRACTION_VALUES = ['museum', 'attraction', 'viewpoint', 'artwork', 'gallery', 'theme_park', 'zoo'];
const NATURE_NATURAL_VALUES = ['peak', 'beach'];
const NATURE_LEISURE_VALUES = ['park'];
const TRANSPORT_AMENITY_VALUES = ['bus_station', 'parking'];
const TRANSPORT_RAILWAY_VALUES = ['station', 'halt'];
const PRACTICAL_AMENITY_VALUES = ['shelter', 'drinking_water', 'toilets'];

const NAME_KEYS = ['name:pl', 'name:en', 'int_name', 'name'];

const pickLocalizedName = (tags = {}) => {
  const key = NAME_KEYS.find((candidate) => tags[candidate]);
  return key ? tags[key] : '';
};

const normalizeTerm = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

export const matchPoiCategory = (query) => {
  const normalized = normalizeTerm(query);
  if (!normalized) return null;

  const entry = Object.entries(POI_SEARCH_TERMS).find(([, terms]) =>
    terms.includes(normalized)
  );
  return entry ? entry[0] : null;
};

const detectCategory = (tags = {}) => {
  if (FOOD_VALUES.includes(tags.amenity)) return 'food';
  if (LODGING_VALUES.includes(tags.tourism)) return 'lodging';
  if (ATTRACTION_VALUES.includes(tags.tourism) || tags.historic) return 'attraction';
  if (NATURE_NATURAL_VALUES.includes(tags.natural)) return 'nature';
  if (NATURE_LEISURE_VALUES.includes(tags.leisure)) return 'nature';
  if (TRANSPORT_RAILWAY_VALUES.includes(tags.railway)) return 'transport';
  if (TRANSPORT_AMENITY_VALUES.includes(tags.amenity)) return 'transport';
  if (PRACTICAL_AMENITY_VALUES.includes(tags.amenity)) return 'practical';
  if (tags.tourism === 'picnic_site') return 'practical';
  return null;
};

const buildQuery = (bounds, categories) => {
  const south = bounds.getSouth().toFixed(6);
  const west = bounds.getWest().toFixed(6);
  const north = bounds.getNorth().toFixed(6);
  const east = bounds.getEast().toFixed(6);
  const bbox = `(${south},${west},${north},${east})`;

  const keys = categories?.length ? categories : AREA_SEARCH_CATEGORIES;
  const statements = keys
    .flatMap((key) => CATEGORY_FILTERS[key] || [])
    .map((filter) => `nwr${filter}${bbox};`)
    .join('');

  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];(${statements});out center ${MAX_RESULTS};`;
};

const toPoi = (element) => {
  const tags = element.tags || {};
  const category = detectCategory(tags);
  if (!category) return null;

  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return {
    id: `${element.type}/${element.id}`,
    lat,
    lng,
    category,
    name: pickLocalizedName(tags),
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    city: tags['addr:city'] || '',
    phone: tags.phone || tags['contact:phone'] || '',
    website: tags.website || tags['contact:website'] || '',
    openingHours: tags.opening_hours || '',
    cuisine: (tags.cuisine || '').replace(/;/g, ', ').replace(/_/g, ' '),
    stars: tags.stars || '',
  };
};

export const overpassService = {
  async searchPois(bounds, { signal, categories } = {}) {
    const query = buildQuery(bounds, categories);
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal,
        });
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        lastError = new Error('Brak połączenia z Overpass API.');
        continue;
      }

      if (response.status === 429) {
        lastError = new Error('Overpass API jest chwilowo przeciążone.');
        continue;
      }
      if (response.status === 504) {
        lastError = new Error('Zapytanie trwało zbyt długo. Przybliż mapę.');
        continue;
      }
      if (!response.ok) {
        lastError = new Error(`Overpass API zwróciło błąd ${response.status}.`);
        continue;
      }

      const data = await response.json();
      const elements = Array.isArray(data.elements) ? data.elements : [];

      const seen = new Set();
      const pois = [];
      elements.forEach((element) => {
        const poi = toPoi(element);
        if (!poi || seen.has(poi.id)) return;
        seen.add(poi.id);
        pois.push(poi);
      });

      return pois;
    }

    throw lastError ?? new Error('Nie udało się pobrać miejsc.');
  },
};
