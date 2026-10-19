import L from 'leaflet';

const WIDTH = 32;
const HEIGHT = 44;
const HEAD_CENTER_Y = 15;
const RING_RADIUS = 10;
const DISC_RADIUS = 8;
const LABEL_OFFSET_X = -0.6;

const cache = new Map();

const escapeSvgText = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const createPinIcon = ({ color, discColor, textColor = '#ffffff', label }) => {
  const raw = String(label ?? '');
  const text = escapeSvgText(raw);
  const fontSize = raw.length > 1 ? 9 : 11;
  const key = `${color}|${discColor}|${textColor}|${raw}`;

  if (!cache.has(key)) {
    cache.set(
      key,
      L.divIcon({
        className: '',
        html:
          `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">` +
          `<path d="M16 2 C8.8 2 3 7.8 3 15 C3 25.5 16 42 16 42 C16 42 29 25.5 29 15 C29 7.8 23.2 2 16 2 Z" fill="${color}"/>` +
          `<circle cx="16" cy="${HEAD_CENTER_Y}" r="${RING_RADIUS}" fill="#ffffff"/>` +
          `<circle cx="16" cy="${HEAD_CENTER_Y}" r="${DISC_RADIUS}" fill="${discColor}"/>` +
          `<text x="${16 + LABEL_OFFSET_X}" y="${HEAD_CENTER_Y}" text-anchor="middle" dominant-baseline="central" ` +
          `font-family="inherit" font-size="${fontSize}" font-weight="700" letter-spacing="0" fill="${textColor}">${text}</text>` +
          `</svg>`,
        iconSize: [WIDTH, HEIGHT],
        iconAnchor: [WIDTH / 2, HEIGHT],
        popupAnchor: [0, -HEIGHT + 6],
      })
    );
  }
  return cache.get(key);
};