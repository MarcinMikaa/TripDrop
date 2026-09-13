import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import styles from './BaseLayerSwitcher.module.scss';

const ESRI_ATTRIBUTION = 'Tiles &copy; Esri';
const ESRI_REFERENCE_ROOT = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference';
const ESRI_PLACES_URL = `${ESRI_REFERENCE_ROOT}/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;
const ESRI_TRANSPORT_URL = `${ESRI_REFERENCE_ROOT}/World_Transportation/MapServer/tile/{z}/{y}/{x}`;

const TRANSPORT_MIN_ZOOM = 13;
const TRANSPORT_OPACITY = 0.6;

const TRACESTRACK_KEY = import.meta.env.VITE_TRACESTRACK_KEY;
const TRACESTRACK_PL_URL = `https://tile.tracestrack.com/pl/{z}/{x}/{y}.webp?key=${TRACESTRACK_KEY}`;
const TRACESTRACK_ATTRIBUTION =
  '&copy; <a href="https://www.tracestrack.com/">Tracestrack</a>, ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const POLISH_BASE_LAYER = TRACESTRACK_KEY
  ? {
      id: 'osm',
      label: 'Mapa',
      url: TRACESTRACK_PL_URL,
      attribution: TRACESTRACK_ATTRIBUTION,
      maxZoom: 19,
    }
  : { id: 'osm', label: 'Mapa', provider: 'OpenStreetMap.Mapnik' };

const BASE_LAYERS = [
  POLISH_BASE_LAYER,
  { id: 'satellite', label: 'Satelita', provider: 'Esri.WorldImagery' },
  {
    id: 'hybrid',
    label: 'Hybryda',
    provider: 'Esri.WorldImagery',
    overlays: [
      { url: ESRI_PLACES_URL },
      { url: ESRI_TRANSPORT_URL, minZoom: TRANSPORT_MIN_ZOOM, opacity: TRANSPORT_OPACITY },
    ],
  },
  { id: 'terrain', label: 'Teren', provider: 'OpenTopoMap' },
];

const PREVIEW_MIN_ZOOM = 3;

const createBaseLayer = (entry) => {
  if (entry.url) {
    return L.tileLayer(entry.url, {
      maxZoom: entry.maxZoom ?? 19,
      attribution: entry.attribution,
    });
  }
  return L.tileLayer.provider(entry.provider);
};

const createEntry = (entry) => {
  const base = createBaseLayer(entry);
  base.setZIndex(1);

  if (!entry.overlays?.length) {
    return { layer: base, sources: [base] };
  }

  const overlays = entry.overlays.map((overlay, index) =>
    L.tileLayer(overlay.url, {
      maxZoom: 19,
      minZoom: overlay.minZoom ?? 0,
      opacity: overlay.opacity ?? 1,
      zIndex: index + 2,
      attribution: ESRI_ATTRIBUTION,
    })
  );

  return {
    layer: L.layerGroup([base, ...overlays]),
    sources: [base, ...overlays],
  };
};

const buildPreviewUrls = (sources, map) => {
  if (!sources?.length) return [];

  const mapZoom = Math.round(map.getZoom());

  const urls = sources
    .filter((source) => mapZoom >= (source.options?.minZoom ?? 0))
    .map((source) => {
      const maxZoom = source.options?.maxZoom ?? 18;
      const zoom = Math.min(Math.max(mapZoom, PREVIEW_MIN_ZOOM), maxZoom);
      const point = map.project(map.getCenter(), zoom).divideBy(256).floor();
      const subdomains = source.options?.subdomains;

      return L.Util.template(source._url, {
        ...source.options,
        s: subdomains ? subdomains[0] : 'a',
        x: point.x,
        y: point.y,
        z: zoom,
        r: '',
      });
    });

  return urls.reverse();
};

const BaseLayerSwitcher = () => {
  const map = useMap();
  const [container, setContainer] = useState(null);
  const [activeId, setActiveId] = useState(BASE_LAYERS[0].id);
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState({});

  const entries = useMemo(() => {
    const created = {};
    BASE_LAYERS.forEach((entry) => {
      try {
        created[entry.id] = createEntry(entry);
      } catch (err) {
        console.error(`[warstwy] Nie udało się utworzyć warstwy ${entry.label}:`, err);
      }
    });
    return created;
  }, []);

  useEffect(() => {
    const control = L.control({ position: 'topright' });
    control.onAdd = () => {
      const div = L.DomUtil.create('div');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      L.DomEvent.on(
        div,
        'click dblclick mousedown pointerdown touchstart',
        L.DomEvent.stopPropagation
      );
      setContainer(div);
      return div;
    };
    control.addTo(map);

    return () => {
      map.removeControl(control);
      setContainer(null);
    };
  }, [map]);

  useEffect(() => {
    if (!container) return undefined;

    const applyWidth = () => {
      container.style.setProperty('--map-width', `${map.getSize().x}px`);
    };

    applyWidth();
    map.on('resize', applyWidth);

    return () => map.off('resize', applyWidth);
  }, [container, map]);

  useEffect(() => {
    const entry = entries[activeId];
    if (!entry) return undefined;
    entry.layer.addTo(map);

    return () => {
      if (map.hasLayer(entry.layer)) map.removeLayer(entry.layer);
    };
  }, [map, entries, activeId]);

  useEffect(() => {
    const ids = open ? BASE_LAYERS.map((entry) => entry.id) : [activeId];

    const update = () => {
      setPreviews((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = buildPreviewUrls(entries[id]?.sources, map);
        });
        return next;
      });
    };

    update();
    map.on('moveend', update);

    return () => map.off('moveend', update);
  }, [open, activeId, map, entries]);

  if (!container) return null;

  const activeLayer = BASE_LAYERS.find((entry) => entry.id === activeId);
  const backgroundFor = (id) =>
    (previews[id] || []).map((url) => `url(${url})`).join(', ');

  return createPortal(
    <div className={styles.switcher}>
      <div
        className={`${styles.panel} ${open ? '' : styles.hidden}`}
        onMouseLeave={() => setOpen(false)}
      >
        {BASE_LAYERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.tile} ${entry.id === activeId ? styles.tileActive : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setActiveId(entry.id);
              setOpen(false);
            }}
          >
            <span
              className={styles.thumb}
              style={{ backgroundImage: backgroundFor(entry.id) }}
            />
            <span className={styles.tileLabel}>{entry.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.trigger}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        title="Zmień warstwę mapy"
      >
        <span
          className={styles.thumb}
          style={{ backgroundImage: backgroundFor(activeId) }}
        />
        <span className={styles.triggerLabel}>{activeLayer?.label}</span>
      </button>
    </div>,
    container
  );
};

export default BaseLayerSwitcher;
