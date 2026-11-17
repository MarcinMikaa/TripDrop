import { useMemo } from 'react';
import styles from './TripThumbnail.module.scss';

const CONTOUR_SCALES = [1, 1.5, 2.1, 2.8];

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRandom = (seed) => {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const buildShapes = (seed) => {
  const random = createRandom(hashString(String(seed)));
  const hill = { cx: 120 + random() * 120, cy: 40 + random() * 60, rx: 24 + random() * 14, ry: 16 + random() * 10 };
  const park = { cx: 30 + random() * 80, cy: 100 + random() * 40, rx: 30 + random() * 16, ry: 18 + random() * 10 };
  const roadY = 70 + random() * 60;
  const bend = random() * 50 - 25;
  const road = `M-10 ${roadY} C 90 ${roadY + bend}, 200 ${roadY - bend}, 310 ${roadY + bend / 2}`;
  const sideX = 60 + random() * 180;
  const side = `M${sideX} -10 C ${sideX + 20} 50, ${sideX - 30} 110, ${sideX + 10} 170`;
  const waterY = 20 + random() * 40;
  const water = random() > 0.5 ? `M-10 ${waterY} C 80 ${waterY + 30}, 180 ${waterY - 20}, 310 ${waterY + 10}` : null;
  return { hill, park, road, side, water };
};

const MapSketch = ({ seed, className = '' }) => {
  const { hill, park, road, side, water } = useMemo(() => buildShapes(seed), [seed]);

  return (
    <svg
      className={`${styles.sketch} ${className}`}
      viewBox="0 0 300 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      <rect width="300" height="160" className={styles.sketchGround} />
      <ellipse cx={park.cx} cy={park.cy} rx={park.rx} ry={park.ry} className={styles.sketchPark} />
      {water && <path d={water} className={styles.sketchWater} />}
      {CONTOUR_SCALES.map((scale) => (
        <ellipse
          key={scale}
          cx={hill.cx}
          cy={hill.cy}
          rx={hill.rx * scale}
          ry={hill.ry * scale}
          className={styles.sketchContour}
        />
      ))}
      <path d={side} className={styles.sketchRoadSmall} />
      <path d={road} className={styles.sketchRoad} />
    </svg>
  );
};

export default MapSketch;
