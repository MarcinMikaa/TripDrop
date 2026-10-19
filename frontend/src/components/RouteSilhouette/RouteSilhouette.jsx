import { useMemo } from 'react';
import { dayColor } from '../../utils/dayColors';
import styles from './RouteSilhouette.module.scss';

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const PADDING = 26;
const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 15;
const SINGLE_POINT_ZOOM = 13;
const MAX_LATITUDE = 85.05112878;

const TRACESTRACK_KEY = import.meta.env.VITE_TRACESTRACK_KEY;
const tileUrl = (z, x, y) =>
  TRACESTRACK_KEY
    ? `https://tile.tracestrack.com/pl/${z}/${x}/${y}.webp?key=${TRACESTRACK_KEY}`
    : `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const ATTRIBUTION = TRACESTRACK_KEY ? '© Tracestrack, © OpenStreetMap' : '© OpenStreetMap';

const project = (lat, lng, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const clampedLat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};

const spanAt = (preview, zoom) => {
  const projected = preview.map(([, lat, lng]) => project(lat, lng, zoom));
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

const fitZoom = (preview) => {
  const first = spanAt(preview, MAX_ZOOM);
  if (first.width === 0 && first.height === 0) return SINGLE_POINT_ZOOM;

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const span = spanAt(preview, zoom);
    if (span.width <= VIEW_WIDTH - 2 * PADDING && span.height <= VIEW_HEIGHT - 2 * PADDING) {
      return zoom;
    }
  }
  return MIN_ZOOM;
};

const buildView = (preview) => {
  const zoom = fitZoom(preview);
  const projected = preview.map(([day, lat, lng]) => ({ day, ...project(lat, lng, zoom) }));

  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const originX = (Math.min(...xs) + Math.max(...xs)) / 2 - VIEW_WIDTH / 2;
  const originY = (Math.min(...ys) + Math.max(...ys)) / 2 - VIEW_HEIGHT / 2;

  const tileCount = 2 ** zoom;
  const tiles = [];
  const firstTileY = Math.floor(originY / TILE_SIZE);
  const lastTileY = Math.floor((originY + VIEW_HEIGHT) / TILE_SIZE);
  const firstTileX = Math.floor(originX / TILE_SIZE);
  const lastTileX = Math.floor((originX + VIEW_WIDTH) / TILE_SIZE);

  for (let ty = firstTileY; ty <= lastTileY; ty += 1) {
    if (ty < 0 || ty >= tileCount) continue;
    for (let tx = firstTileX; tx <= lastTileX; tx += 1) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: tileUrl(zoom, wrappedX, ty),
        left: ((tx * TILE_SIZE - originX) / VIEW_WIDTH) * 100,
        top: ((ty * TILE_SIZE - originY) / VIEW_HEIGHT) * 100,
      });
    }
  }

  const points = projected.map((p) => ({ day: p.day, x: p.x - originX, y: p.y - originY }));
  return { tiles, points };
};

const TILE_WIDTH = `calc(${(TILE_SIZE / VIEW_WIDTH) * 100}% + 1px)`;
const TILE_HEIGHT = `calc(${(TILE_SIZE / VIEW_HEIGHT) * 100}% + 1px)`;

const hideBrokenTile = (event) => {
  event.currentTarget.style.visibility = 'hidden';
};

const RouteSilhouette = ({ preview, className, label }) => {
  const view = useMemo(() => (preview?.length ? buildView(preview) : null), [preview]);

  return (
    <div className={`${styles.root} ${className ?? ''}`} role="img" aria-label={label}>
      {view?.tiles.map((tile) => (
        <img
          key={tile.key}
          className={styles.tile}
          src={tile.url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{ left: `${tile.left}%`, top: `${tile.top}%`, width: TILE_WIDTH, height: TILE_HEIGHT }}
          onError={hideBrokenTile}
        />
      ))}

      <svg
        className={styles.overlay}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true">
        {view?.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="4.5"
            fill={dayColor(p.day)}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {view?.tiles.length > 0 && <span className={styles.attribution}>{ATTRIBUTION}</span>}
    </div>
  );
};

export default RouteSilhouette;
