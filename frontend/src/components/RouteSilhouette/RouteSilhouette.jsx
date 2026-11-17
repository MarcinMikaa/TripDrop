import { useEffect, useMemo, useRef, useState } from 'react';
import { dayColor } from '../../utils/dayColors';
import styles from './RouteSilhouette.module.scss';

const VIEW_WIDTH = 320;
const DEFAULT_VIEW_HEIGHT = 180;
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 4;
const PADDING = 26;
const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 15;
const SINGLE_POINT_ZOOM = 13;
const MAX_LATITUDE = 85.05112878;
const UNASSIGNED_COLOR = '#9a9286';

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

const fitZoom = (preview, viewHeight) => {
  const first = spanAt(preview, MAX_ZOOM);
  if (first.width === 0 && first.height === 0) return SINGLE_POINT_ZOOM;

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const span = spanAt(preview, zoom);
    if (span.width <= VIEW_WIDTH - 2 * PADDING && span.height <= viewHeight - 2 * PADDING) {
      return zoom;
    }
  }
  return MIN_ZOOM;
};

const buildView = (preview, viewHeight) => {
  const zoom = fitZoom(preview, viewHeight);
  const projected = preview.map(([day, lat, lng]) => ({ day, ...project(lat, lng, zoom) }));

  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const originX = (Math.min(...xs) + Math.max(...xs)) / 2 - VIEW_WIDTH / 2;
  const originY = (Math.min(...ys) + Math.max(...ys)) / 2 - viewHeight / 2;

  const tileCount = 2 ** zoom;
  const tiles = [];
  const firstTileY = Math.floor(originY / TILE_SIZE);
  const lastTileY = Math.floor((originY + viewHeight) / TILE_SIZE);
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
        top: ((ty * TILE_SIZE - originY) / viewHeight) * 100,
      });
    }
  }

  const points = projected.map((p) => ({ day: p.day, x: p.x - originX, y: p.y - originY }));
  return { tiles, points };
};

const isValidPoint = (point) => Array.isArray(point) && Number.isFinite(point[1]) && Number.isFinite(point[2]);

const pointColor = (day) => (day === null || day === undefined ? UNASSIGNED_COLOR : dayColor(day));

const TILE_WIDTH = `calc(${(TILE_SIZE / VIEW_WIDTH) * 100}% + 1px)`;

const hideBrokenTile = (event) => {
  event.currentTarget.style.visibility = 'hidden';
};

const useViewHeight = (ref) => {
  const [viewHeight, setViewHeight] = useState(DEFAULT_VIEW_HEIGHT);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
      const next = Math.round(VIEW_WIDTH / aspect);
      setViewHeight((prev) => (prev === next ? prev : next));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return viewHeight;
};

const RouteSilhouette = ({ preview, className, label }) => {
  const rootRef = useRef(null);
  const viewHeight = useViewHeight(rootRef);

  const points = useMemo(() => (Array.isArray(preview) ? preview.filter(isValidPoint) : []), [preview]);
  const view = useMemo(() => (points.length ? buildView(points, viewHeight) : null), [points, viewHeight]);
  const tileHeight = `calc(${(TILE_SIZE / viewHeight) * 100}% + 1px)`;

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`} role="img" aria-label={label}>
      {view?.tiles.map((tile) => (
        <img
          key={tile.key}
          className={styles.tile}
          src={tile.url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{ left: `${tile.left}%`, top: `${tile.top}%`, width: TILE_WIDTH, height: tileHeight }}
          onError={hideBrokenTile}
        />
      ))}

      <svg
        className={styles.overlay}
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true">
        {view?.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="4.5"
            fill={pointColor(p.day)}
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
