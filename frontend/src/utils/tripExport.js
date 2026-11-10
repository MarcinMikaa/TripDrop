export const TRAVEL_MODES = [
  { key: 'car', label: 'Samochód', icon: 'car', google: 'driving', mapy: 'car_fast' },
  { key: 'foot', label: 'Pieszo', icon: 'person-walking', google: 'walking', mapy: 'foot_fast' },
  { key: 'bike', label: 'Rower', icon: 'bicycle', google: 'bicycling', mapy: 'bike_road' },
];
export const DEFAULT_TRAVEL_MODE = 'car';

export const GOOGLE_MAX_POINTS = 11;
export const MAPY_MAX_POINTS = 17;

export const KML_MIME = 'application/vnd.google-earth.kml+xml';
export const GPX_MIME = 'application/gpx+xml';
export const UNASSIGNED_LABEL = 'Do rozważenia';
const UNASSIGNED_COLOR = '#6f6f6f';

const COORD_DECIMALS = 6;

const modeOf = (key) => TRAVEL_MODES.find((mode) => mode.key === key) ?? TRAVEL_MODES[0];
const fmt = (value) => Number(value).toFixed(COORD_DECIMALS);

const latLng = (point) => `${fmt(point.lat)},${fmt(point.lng)}`;
const lngLat = (point) => `${fmt(point.lng)},${fmt(point.lat)}`;

export const chunkPoints = (points, maxPerLink) => {
  if (points.length === 0) return [];
  if (points.length <= maxPerLink) return [{ from: 1, to: points.length, points }];

  const chunks = [];
  let start = 0;
  while (start < points.length - 1) {
    const end = Math.min(start + maxPerLink - 1, points.length - 1);
    chunks.push({ from: start + 1, to: end + 1, points: points.slice(start, end + 1) });
    start = end;
  }
  return chunks;
};

const googleSearchUrl = (point) =>
  `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: latLng(point) })}`;

const googleDirectionsUrl = (points, modeKey) => {
  const params = new URLSearchParams({
    api: '1',
    origin: latLng(points[0]),
    destination: latLng(points[points.length - 1]),
    travelmode: modeOf(modeKey).google,
  });
  const middle = points.slice(1, -1);
  if (middle.length > 0) params.set('waypoints', middle.map(latLng).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
};

export const googleDayLinks = (points, modeKey = DEFAULT_TRAVEL_MODE) =>
  chunkPoints(points, GOOGLE_MAX_POINTS).map(({ from, to, points: part }) => ({
    from,
    to,
    url: part.length === 1 ? googleSearchUrl(part[0]) : googleDirectionsUrl(part, modeKey),
  }));

export const googleNavigateLink = (point, modeKey = DEFAULT_TRAVEL_MODE) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: '1',
    destination: latLng(point),
    travelmode: modeOf(modeKey).google,
    dir_action: 'navigate',
  })}`;

const mapyPointUrl = (point) =>
  `https://mapy.com/fnc/v1/showmap?${new URLSearchParams({
    center: lngLat(point),
    zoom: '16',
    marker: 'true',
  })}`;

const mapyRouteUrl = (points, modeKey) => {
  const params = new URLSearchParams({
    start: lngLat(points[0]),
    end: lngLat(points[points.length - 1]),
    routeType: modeOf(modeKey).mapy,
  });
  const middle = points.slice(1, -1);
  if (middle.length > 0) params.set('waypoints', middle.map(lngLat).join(';'));
  return `https://mapy.com/fnc/v1/route?${params}`;
};

export const mapyDayLinks = (points, modeKey = DEFAULT_TRAVEL_MODE) =>
  chunkPoints(points, MAPY_MAX_POINTS).map(({ from, to, points: part }) => ({
    from,
    to,
    url: part.length === 1 ? mapyPointUrl(part[0]) : mapyRouteUrl(part, modeKey),
  }));

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
export const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);

export const toKmlColor = (hex, alpha = 'ff') => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  const rgb = match ? match[1] : UNASSIGNED_COLOR.slice(1);
  return `${alpha}${rgb.slice(4, 6)}${rgb.slice(2, 4)}${rgb.slice(0, 2)}`.toLowerCase();
};

const kmlStyle = (id, color) =>
  `<Style id="${id}"><IconStyle><color>${toKmlColor(color)}</color><scale>1.1</scale>` +
  '<Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon>' +
  '</IconStyle></Style>';

const kmlPlacemark = (name, styleId, point, description) =>
  `<Placemark><name>${escapeXml(name)}</name>` +
  (description ? `<description>${escapeXml(description)}</description>` : '') +
  `<styleUrl>#${styleId}</styleUrl>` +
  `<Point><coordinates>${lngLat(point)},0</coordinates></Point></Placemark>`;

const kmlFolder = (name, placemarks) => `<Folder><name>${escapeXml(name)}</name>${placemarks.join('')}</Folder>`;

export const buildKml = ({ title, days, unassigned = [] }) => {
  const styles = days.map((day, i) => kmlStyle(`day-${i}`, day.color));
  if (unassigned.length > 0) styles.push(kmlStyle('unassigned', UNASSIGNED_COLOR));

  const folders = days
    .map((day, i) =>
      day.points.length === 0
        ? null
        : kmlFolder(
            day.label,
            day.points.map((point, n) =>
              kmlPlacemark(`${n + 1}. ${point.name}`, `day-${i}`, point, `${day.label}, punkt ${n + 1}`),
            ),
          ),
    )
    .filter(Boolean);

  if (unassigned.length > 0) {
    folders.push(
      kmlFolder(
        UNASSIGNED_LABEL,
        unassigned.map((point) => kmlPlacemark(point.name, 'unassigned', point)),
      ),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '<Document>',
    `<name>${escapeXml(title)}</name>`,
    ...styles,
    ...folders,
    '</Document>',
    '</kml>',
  ].join('\n');
};

const gpxPoint = (tag, point, name, type) =>
  `<${tag} lat="${fmt(point.lat)}" lon="${fmt(point.lng)}">` +
  `<name>${escapeXml(name)}</name>` +
  (type ? `<type>${escapeXml(type)}</type>` : '') +
  `</${tag}>`;

export const buildGpx = ({ title, days, unassigned = [] }) => {
  const waypoints = [
    ...days.flatMap((day, i) =>
      // "D1.2" na początku nazwy - aplikacje sortują punkty alfabetycznie
      day.points.map((point, n) => gpxPoint('wpt', point, `D${i + 1}.${n + 1} ${point.name}`, day.label)),
    ),
    ...unassigned.map((point) => gpxPoint('wpt', point, point.name, UNASSIGNED_LABEL)),
  ];

  const routes = days
    .filter((day) => day.points.length >= 2)
    .map(
      (day) =>
        `<rte><name>${escapeXml(day.label)}</name>` +
        day.points.map((point, n) => gpxPoint('rtept', point, `${n + 1}. ${point.name}`)).join('') +
        '</rte>',
    );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="TripDrop" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>${escapeXml(title)}</name></metadata>`,
    ...waypoints,
    ...routes,
    '</gpx>',
  ].join('\n');
};

export const fileSafeName = (title, fallback = 'wycieczka') => {
  const slug = String(title ?? '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
};

export const formatCoords = (point) => `${fmt(point.lat)}, ${fmt(point.lng)}`;

// Jedyna funkcja z efektem ubocznym - dlatego na końcu i osobno
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
