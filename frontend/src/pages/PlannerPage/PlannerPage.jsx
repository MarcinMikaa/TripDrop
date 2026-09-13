import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { tripPointService } from '../../services/TripPointService';
import { overpassService, POI_CATEGORIES, POI_MIN_ZOOM, matchPoiCategory } from '../../services/OverpassService';
import { MapContainer, Marker, Marker as LeafletMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
window.L = L;
import 'leaflet-providers';
import { LocateControl } from 'leaflet.locatecontrol';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import 'leaflet-easybutton';
import 'leaflet-easybutton/src/easy-button.css';
import 'leaflet.awesome-markers';
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css';
import '@fortawesome/fontawesome-free/css/v4-shims.min.css';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BaseLayerSwitcher from './BaseLayerSwitcher';
import styles from './PlannerPage.module.scss';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useTripPointsRealtime } from '../../hooks/useTripPointsRealtime';
import useAuth from '../../hooks/useAuth';
import { useTripPresence } from '../../hooks/useTripPresence';
import { colorForUser } from '../../utils/useColor';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [51.4297, 20.1122];
const DEFAULT_ZOOM = 13;
const UNASSIGNED_KEY = 'unassigned';
const MAX_PIN_NAME_LENGTH = 200;

const DAY_MARKER_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'cadetblue',
  'darkgreen',
  'darkblue',
  'darkpurple',
  'darkred',
];
const UNASSIGNED_MARKER_COLOR = 'gray';
const ENDPOINT_MARKER_ICON = 'flag';
const MIDPOINT_MARKER_ICON = 'circle';
const POPUP_CLOSE_CLICK_GRACE_MS = 150;
const GEOSEARCH_RESULT_LIMIT = 10;
const SEARCH_BAR_RIGHT_GUTTER = 260;

const markerIconCache = new Map();

const markerColorForDay = (dayIndex) =>
  dayIndex === null || dayIndex === undefined
    ? UNASSIGNED_MARKER_COLOR
    : DAY_MARKER_COLORS[dayIndex % DAY_MARKER_COLORS.length];

const getPinIcon = (dayIndex, isEndpoint) => {
  const markerColor = markerColorForDay(dayIndex);
  const icon = isEndpoint ? ENDPOINT_MARKER_ICON : MIDPOINT_MARKER_ICON;
  const cacheKey = `${markerColor}:${icon}`;
  if (!markerIconCache.has(cacheKey)) {
    markerIconCache.set(
      cacheKey,
      L.AwesomeMarkers.icon({
        icon,
        prefix: 'fa',
        markerColor,
        iconColor: 'white',
      })
    );
  }
  return markerIconCache.get(cacheKey);
};

const POI_MARKER_SIZE = 24;

const getPoiIcon = (category) => {
  const config = POI_CATEGORIES[category];
  if (!config) return null;
  const cacheKey = `poi:${category}`;
  if (!markerIconCache.has(cacheKey)) {
    const half = POI_MARKER_SIZE / 2;
    markerIconCache.set(
      cacheKey,
      L.divIcon({
        className: '',
        html:
          `<span style="display:flex;align-items:center;justify-content:center;` +
          `width:${POI_MARKER_SIZE}px;height:${POI_MARKER_SIZE}px;border-radius:50%;` +
          `background:${config.color};color:#fff;font-size:12px;` +
          `box-shadow:0 0 0 2px var(--stone), 0 1px 3px rgba(0,0,0,0.4);">` +
          `<i class="fa fa-${config.icon}"></i></span>`,
        iconSize: [POI_MARKER_SIZE, POI_MARKER_SIZE],
        iconAnchor: [half, half],
        popupAnchor: [0, -half],
      })
    );
  }
  return markerIconCache.get(cacheKey);
};

//formater dla popupa
const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

//build Koszykow
const buildBuckets = (startDate, endDate) => {
  const buckets = [{ key: UNASSIGNED_KEY, dayIndex: null, label: 'Nieprzypisane' }];
  if (!startDate || !endDate) return buckets;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  let index = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    let label = formatter.format(cursor);
    label = label.charAt(0).toUpperCase() + label.slice(1);
    buckets.push({ key: String(index), dayIndex: index, label });
    index++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
};

const bucketKeyFromDayIndex = (dayIndex) =>
  dayIndex === null || dayIndex === undefined ? UNASSIGNED_KEY : String(dayIndex);

const dayIndexFromBucketKey = (key) => (key === UNASSIGNED_KEY ? null : parseInt(key, 10));

const ResizeAware = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const MapClickHandler = ({ onEmptyClick, contextMenuOpen }) => {
  const contextMenuOpenRef = useRef(contextMenuOpen);
  const markerPopupClosedAtRef = useRef(0);

  useEffect(() => {
    contextMenuOpenRef.current = contextMenuOpen;
  }, [contextMenuOpen]);

  useMapEvents({
    popupclose() {
      if (!contextMenuOpenRef.current) {
        markerPopupClosedAtRef.current = Date.now();
      }
    },
    click(e) {
      if (e.originalEvent?.target?.closest?.('.leaflet-marker-icon')) return;
      if (Date.now() - markerPopupClosedAtRef.current < POPUP_CLOSE_CLICK_GRACE_MS) {
        markerPopupClosedAtRef.current = 0;
        return;
      }
      onEmptyClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

//Znajdz mnie
const LocateButton = () => {
  const map = useMap();

  useEffect(() => {
    let control;
    try {
      control = new LocateControl({
        position: 'topleft',
        flyTo: true,
        showPopup: false,
        drawCircle: true,
        setView: 'once',
        locateOptions: {
          maxZoom: 15,
          enableHighAccuracy: true,
        },
        strings: {
          title: 'Pokaż moją lokalizację',
          metersUnit: 'metrów',
          feetUnit: 'stóp',
          popup: 'Twoja lokalizacja z dokładnością do {distance} {unit}',
          outsideMapBoundsMsg: 'Jesteś poza granicami mapy',
        },
        onLocationError: (err) => {
          console.warn('[locate] Nie udało się ustalić lokalizacji:', err?.message ?? err);
        },
      });

      control.addTo(map);
    } catch (err) {
      console.error('[locate] Kontrolka lokalizacji niedostępna:', err);
      return undefined;
    }

    return () => {
      try {
        map.removeControl(control);
      } catch (removeErr) {
        console.warn('[locate] Nie udało się usunąć kontrolki:', removeErr?.message ?? removeErr);
      }
    };
  }, [map]);

  return null;
};

const pickPlaceName = (label) => {
  if (!label) return '';
  const parts = String(label)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  let name = parts[0];
  if (/^\d+[a-zA-Z]?$/.test(name) && parts.length > 1) {
    name = `${parts[1]} ${parts[0]}`;
  }
  return name.slice(0, MAX_PIN_NAME_LENGTH);
};

const GeoSearchField = ({ onResult, onPoiResults, onPoiMessage }) => {
  const map = useMap();
  const onResultRef = useRef(onResult);
  const onPoiResultsRef = useRef(onPoiResults);
  const onPoiMessageRef = useRef(onPoiMessage);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onPoiResultsRef.current = onPoiResults; }, [onPoiResults]);
  useEffect(() => { onPoiMessageRef.current = onPoiMessage; }, [onPoiMessage]);

  useEffect(() => {
    let control;

    const nominatim = new OpenStreetMapProvider({
      params: { 'accept-language': 'pl' },
    });

    const provider = {
      async search({ query }) {
        const category = matchPoiCategory(query);
        if (!category) return nominatim.search({ query });

        if (map.getZoom() < POI_MIN_ZOOM) {
          onPoiMessageRef.current?.('Przybliż mapę, żeby wyszukać miejsca w okolicy.');
          return [];
        }

        onPoiMessageRef.current?.('Szukam miejsc...');
        try {
          const found = await overpassService.searchPois(map.getBounds(), {
            categories: [category],
          });
          onPoiResultsRef.current?.(found);
          onPoiMessageRef.current?.(
            found.length === 0
              ? 'Nie znaleziono miejsc w tym obszarze.'
              : `Znaleziono ${found.length} miejsc.`
          );
          return found.slice(0, GEOSEARCH_RESULT_LIMIT).map((poi) => ({
            x: poi.lng,
            y: poi.lat,
            label: poi.name,
            bounds: null,
            raw: poi,
          }));
        } catch (err) {
          if (err.name === 'AbortError') return [];
          onPoiMessageRef.current?.(err.message);
          return [];
        }
      },
    };

    try {
      control = new GeoSearchControl({
        provider,
        style: 'bar',
        position: 'topleft',
        showMarker: false,
        showPopup: false,
        autoClose: true,
        keepResult: false,
        retainZoomLevel: false,
        animateZoom: true,
        autoComplete: true,
        autoCompleteDelay: 400,
        searchLabel: 'Szukaj miejsca lub kategorii...',
        notFoundMessage: 'Nie znaleziono takiego miejsca.',
      });

      map.addControl(control);

      const searchBar = control.getContainer?.();
      if (searchBar) {
        searchBar.style.maxWidth = `calc(100% - ${SEARCH_BAR_RIGHT_GUTTER}px)`;
      }
    } catch (err) {
      console.error('[geosearch] Wyszukiwarka niedostępna:', err);
      return undefined;
    }

    const handleShowLocation = (event) => {
      const location = event?.location;
      if (!location) return;
      onResultRef.current?.(location.y, location.x, pickPlaceName(location.label));
    };

    map.on('geosearch/showlocation', handleShowLocation);

    return () => {
      map.off('geosearch/showlocation', handleShowLocation);
      try {
        map.removeControl(control);
      } catch (removeErr) {
        console.warn('[geosearch] Nie udało się usunąć kontrolki:', removeErr?.message ?? removeErr);
      }
    };
  }, [map]);

  return null;
};

const FitToPinsButton = ({ pins }) => {
  const map = useMap();
  const pinsRef = useRef(pins);
  useEffect(() => { pinsRef.current = pins; }, [pins]);

  useEffect(() => {
    const btn = L.easyButton(
      '<i class="fas fa-crosshairs" style="line-height:30px;font-size:14px;"></i>',
      () => {
        const current = pinsRef.current;
        if (!current || current.length === 0) return;
        const bounds = L.latLngBounds(current.map((p) => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      },
      'Wyśrodkuj na pinezkach'
    ).addTo(map);
    return () => map.removeControl(btn);
  }, [map]);

  return null;
};

const CursorTracker = ({ onMove, onLeave }) => {
  useMapEvents({
    mousemove(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
    mouseout() {
      onLeave();
    },
  });
  return null;
};

const RemoteCursor = ({ userId, username, lat, lng }) => {
  const color = colorForUser(userId);
  const initial = (username || '?')[0].toUpperCase();

  const icon = useMemo(
    () =>
      L.divIcon({
        className: styles.remoteCursorIcon,
        html: `
        <div class="${styles.cursorWrap}">
          <svg width="32" height="32" viewBox="0 0 20 20">
            <path d="M2 1 L17 9.5 L9.5 11 L7 18 Z" fill="${color}" stroke="white" stroke-width="1.3" stroke-linejoin="round"/>
          </svg>
          <span class="${styles.cursorLabel}" style="background:${color}">${initial}</span>
        </div>`,
        iconSize: [64, 40],
        iconAnchor: [4, 3],
      }),
    [color, initial],
  );

  return <LeafletMarker position={[lat, lng]} icon={icon} interactive={false} zIndexOffset={1000} />;
};

const RemoteCursors = ({ others }) => (
  <>
    {others
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => (
        <RemoteCursor key={o.userId} userId={o.userId} username={o.username} lat={o.lat} lng={o.lng} />
      ))}
  </>
);

const PresenceBar = ({ others }) => {
  const map = useMap();
  const [expanded, setExpanded] = useState(false);
  const [container, setContainer] = useState(null);

  useEffect(() => {
    const control = L.control({ position: 'bottomleft' });
    control.onAdd = () => {
      const div = L.DomUtil.create('div');
      L.DomEvent.disableClickPropagation(div);
      setContainer(div);
      return div;
    };
    control.addTo(map);
    return () => {
      map.removeControl(control);
      setContainer(null);
    };
  }, [map]);

  if (!container || others.length === 0) return null;

  return createPortal(
    <div className={styles.presenceBar} onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
      <span className={styles.presenceToggle}>{expanded ? '\u2039' : '\u203A'}</span>
      <span className={styles.presenceCount}>{others.length}</span>
      {expanded && (
        <div className={styles.presenceList}>
          {others.map((o) => (
            <div key={o.userId} className={styles.presenceItem}>
              <span className={styles.presenceAvatar} style={{ background: colorForUser(o.userId) }}>
                {(o.username || '?')[0].toUpperCase()}
              </span>
              <span className={styles.presenceName}>{o.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>,
    container,
  );
};

const SearchAreaButton = ({ onSearch, onClear }) => {
  const map = useMap();
  const onSearchRef = useRef(onSearch);
  const onClearRef = useRef(onClear);

  useEffect(() => { onSearchRef.current = onSearch; }, [onSearch]);
  useEffect(() => { onClearRef.current = onClear; }, [onClear]);

  useEffect(() => {
    const searchBtn = L.easyButton(
      '<i class="fas fa-magnifying-glass-location" style="line-height:30px;font-size:14px;"></i>',
      () => onSearchRef.current?.(map.getBounds(), map.getZoom()),
      'Szukaj miejsc na tym obszarze'
    ).addTo(map);

    const clearBtn = L.easyButton(
      '<i class="fas fa-eraser" style="line-height:30px;font-size:14px;"></i>',
      () => onClearRef.current?.(),
      'Wyczyść znalezione miejsca'
    ).addTo(map);

    return () => {
      map.removeControl(searchBtn);
      map.removeControl(clearBtn);
    };
  }, [map]);

  return null;
};

const PoiStatusControl = ({ message }) => {
  const map = useMap();

  useEffect(() => {
    if (!message) return undefined;

    const control = L.control({ position: 'bottomleft' });
    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar');
      div.textContent = message;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    control.addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, message]);

  return null;
};

const PoiPopupContent = ({ poi }) => {
  const category = POI_CATEGORIES[poi.category];
  const location = [poi.address, poi.city].filter(Boolean).join(', ');

  return (
    <div className={styles.popup}>
      <div className={styles.popupName}>{poi.name || category?.label || 'Miejsce'}</div>
      <dl className={styles.popupMeta}>
        <dt>Rodzaj:</dt>
        <dd>{category?.label || 'Miejsce'}</dd>
        {location ? (
          <>
            <dt>Adres:</dt>
            <dd>{location}</dd>
          </>
        ) : null}
        {poi.cuisine ? (
          <>
            <dt>Kuchnia:</dt>
            <dd>{poi.cuisine}</dd>
          </>
        ) : null}
        {poi.stars ? (
          <>
            <dt>Standard:</dt>
            <dd>{poi.stars}</dd>
          </>
        ) : null}
        {poi.openingHours ? (
          <>
            <dt>Godziny:</dt>
            <dd>{poi.openingHours}</dd>
          </>
        ) : null}
        {poi.phone ? (
          <>
            <dt>Telefon:</dt>
            <dd>
              <a href={`tel:${poi.phone}`}>{poi.phone}</a>
            </dd>
          </>
        ) : null}
        {poi.website ? (
          <>
            <dt>Strona:</dt>
            <dd>
              <a href={poi.website} target="_blank" rel="noreferrer">
                Otwórz
              </a>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
};

const MarkerPopupContent = ({ pin, onAddPin, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pin.name || '');

  useEffect(() => {
    if (!editing) setValue(pin.name || '');
  }, [pin.name, editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed !== (pin.name || '')) onEdit(pin.id, trimmed);
    setEditing(false);
  };
  const cancel = () => {
    setValue(pin.name || '');
    setEditing(false);
  };

  return (
    <div className={styles.popup}>
      {editing ? (
        <input
          type="text"
          autoFocus
          maxLength={MAX_PIN_NAME_LENGTH}
          className={styles.popupNameInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
        />
      ) : (
        <div
          className={styles.popupName}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {pin.name?.trim() || <em>Bez nazwy</em>}
        </div>
      )}
      <dl className={styles.popupMeta}>
        <dt>Dodano:</dt>
        <dd>{dateFormatter.format(new Date(pin.createdAt))}</dd>
        <dt>Autor:</dt>
        <dd>{pin.userName || 'nieznany'}</dd>
      </dl>
      <div className={styles.popupActions}>
        <button type="button" onClick={() => onAddPin(pin.latitude, pin.longitude)}>
          Dodaj pinezkę
        </button>
        <button type="button" onClick={() => onDelete(pin.id)}>
          Usuń pinezkę
        </button>
      </div>
    </div>
  );
};

const EmptyContextMenu = ({ position, onAddPin, onClose }) => (
  <Popup
    position={[position.lat, position.lng]}
    eventHandlers={{ remove: onClose }}
  >
    <div className={styles.popup}>
      {position.name ? (
        <div className={styles.popupName}>{position.name}</div>
      ) : null}
      <div className={styles.popupActions}>
        <button
          type="button"
          onClick={() => onAddPin(position.lat, position.lng, position.name || '')}
        >
          Dodaj pinezkę
        </button>
      </div>
    </div>
  </Popup>
);

//Pojedyncza pinezka w koszyku
const PinCard = ({ pin, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pin.name || '');

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: pin.id, disabled: editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed !== (pin.name || '')) onRename(pin.id, trimmed);
    setEditing(false);
  };
  const cancel = () => {
    setValue(pin.name || '');
    setEditing(false);
  };

  useEffect(() => {
    if (!editing) setValue(pin.name || '');
  }, [pin.name, editing]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.pinCard} ${isDragging ? styles.pinCardDragging : ''}`}
      {...attributes}
      {...listeners}
    >
      {editing ? (
        <input
          autoFocus
          className={styles.pinNameInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={styles.pinName}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
          {pin.name?.trim() || <em className={styles.pinNamePlaceholder}>Bez nazwy</em>}
        </span>
      )}
    </div>
  );
};

//Koszyk dniia
const Bucket = ({ bucket, pins, onRename }) => {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.key });
  const pinIds = pins.map((p) => p.id);
  return (
    <div className={styles.dayColumn}>
      <div className={styles.dayHeader}>
        <span className={styles.dayName}>{bucket.label}</span>
        <span className={styles.dayCount}>{pins.length}</span>
      </div>
      <SortableContext items={pinIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`${styles.pinList} ${isOver ? styles.pinListOver : ''}`}
        >
          {pins.length === 0 ? (
            <div className={styles.emptyState}>Brak pinezek</div>
          ) : (
            pins.map((pin) => <PinCard key={pin.id} pin={pin} onRename={onRename} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
};

//Komponent główny
const PlannerPage = () => {
  const { id: tripId } = useParams();

  const [trip, setTrip] = useState(null);
  const [pins, setPins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup context menu (klik w puste miejsce na mapie)
  const [contextMenuPos, setContextMenuPos] = useState(null);

  const [pois, setPois] = useState([]);
  const [poiMessage, setPoiMessage] = useState('');
  const poiRequestRef = useRef(null);

  useEffect(() => () => {
    poiRequestRef.current?.abort();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tripData, pointsData] = await Promise.all([
          tripService.getById(tripId),
          tripPointService.getByTripId(tripId),
        ]);
        if (!cancelled) {
          setTrip(tripData);
          setPins(pointsData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [tripId]);


  const refetchPins = useCallback(async () => {
    try {
      const data = await tripPointService.getByTripId(tripId);
      setPins(data);
    } catch (err) {
      setError(err.message);
    }
  }, [tripId]);

  useTripPointsRealtime(tripId, refetchPins);

  const { user } = useAuth();
  const { present, others, updateCursor, clearCursor } = useTripPresence(tripId, user);

  const buckets = useMemo(
    () => buildBuckets(trip?.startDate, trip?.endDate),
    [trip]
  );

  //grupowanie pinezek po koszukach
  const pinsByBucket = useMemo(() => {
    const groups = {};
    buckets.forEach((b) => { groups[b.key] = []; });
    pins.forEach((p) => {
      const key = bucketKeyFromDayIndex(p.dayIndex);
      if (groups[key]) groups[key].push(p);
    });
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => a.position - b.position)
    );
    return groups;
  }, [pins, buckets]);

  const endpointPinIds = useMemo(() => {
    const ids = new Set();
    buckets.forEach((bucket) => {
      if (bucket.dayIndex === null) return;
      const group = pinsByBucket[bucket.key] || [];
      if (group.length === 0) return;
      ids.add(group[0].id);
      ids.add(group[group.length - 1].id);
    });
    return ids;
  }, [buckets, pinsByBucket]);

  //Pusty klik
  const handleEmptyMapClick = ({ lat, lng }) => {
    setContextMenuPos({ lat, lng });
  };

  const handleSearchArea = async (bounds, zoom) => {
    if (zoom < POI_MIN_ZOOM) {
      setPoiMessage('Przybliż mapę, żeby wyszukać miejsca w okolicy.');
      return;
    }

    poiRequestRef.current?.abort();
    const controller = new AbortController();
    poiRequestRef.current = controller;

    setPoiMessage('Szukam miejsc...');
    try {
      const found = await overpassService.searchPois(bounds, {
        signal: controller.signal,
      });
      setPois(found);
      setPoiMessage(
        found.length === 0
          ? 'Nie znaleziono miejsc w tym obszarze.'
          : `Znaleziono ${found.length} miejsc.`
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
      setPoiMessage(err.message);
    } finally {
      if (poiRequestRef.current === controller) poiRequestRef.current = null;
    }
  };

  const handleClearPois = () => {
    poiRequestRef.current?.abort();
    poiRequestRef.current = null;
    setPois([]);
    setPoiMessage('');
  };

  const handleSearchResult = (lat, lng, name) => {
    setContextMenuPos({ lat, lng, name });
  };

  const handleCreatePin = async (lat, lng, name = '') => {
    setContextMenuPos(null);
    try {
      const created = await tripPointService.create(tripId, {
        name,
        latitude: lat,
        longitude: lng,
        dayIndex: null,
      });
      setPins((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRename = async (pointId, newName) => {
    const target = pins.find((p) => p.id === pointId);
    if (!target) return;

    const prev = pins;
    setPins((old) =>
      old.map((p) => (p.id === pointId ? { ...p, name: newName } : p))
    );
    try {
      await tripPointService.update(tripId, pointId, {
        name: newName,
        dayIndex: target.dayIndex,
        position: target.position,
      });
    } catch (err) {
      setPins(prev);
      setError(err.message);
    }
  };

  const handleDelete = async (pointId) => {
    const prev = pins;
    setPins((old) => old.filter((p) => p.id !== pointId));
    try {
      await tripPointService.delete(tripId, pointId);
    } catch (err) {
      setPins(prev);
      setError(err.message);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const activePin = pins.find((p) => p.id === activeId);
    if (!activePin) return;

    const overPin = pins.find((p) => p.id === overId);
    const targetBucketKey = overPin
      ? bucketKeyFromDayIndex(overPin.dayIndex)
      : overId;
    const targetDayIndex = dayIndexFromBucketKey(targetBucketKey);
    const sourceBucketKey = bucketKeyFromDayIndex(activePin.dayIndex);
    const sameBucket = sourceBucketKey === targetBucketKey;

    const sourcePins = [...(pinsByBucket[sourceBucketKey] || [])];
    const targetPins = sameBucket ? sourcePins : [...(pinsByBucket[targetBucketKey] || [])];
    const overIndexInTarget = overPin
      ? targetPins.findIndex((p) => p.id === overId)
      : targetPins.length;

    let reorderedTarget;
    let reorderedSource = null;

    if (sameBucket) {
      const oldIndex = sourcePins.findIndex((p) => p.id === activeId);
      if (oldIndex === -1 || overIndexInTarget === -1 || oldIndex === overIndexInTarget) return;
      reorderedTarget = arrayMove(sourcePins, oldIndex, overIndexInTarget);
    } else {
      reorderedSource = sourcePins.filter((p) => p.id !== activeId);
      const movedPin = { ...activePin, dayIndex: targetDayIndex };
      reorderedTarget = [
        ...targetPins.slice(0, overIndexInTarget),
        movedPin,
        ...targetPins.slice(overIndexInTarget),
      ];
    }

    const otherPins = pins.filter((p) => {
      const k = bucketKeyFromDayIndex(p.dayIndex);
      return k !== sourceBucketKey && k !== targetBucketKey;
    });
    const newTarget = reorderedTarget.map((p, i) => ({
      ...p, dayIndex: targetDayIndex, position: i,
    }));
    const newSource = reorderedSource
      ? reorderedSource.map((p, i) => ({ ...p, position: i }))
      : [];
    const newPins = [...otherPins, ...newTarget, ...newSource];

    const previousPins = pins;
    setPins(newPins);

    const changed = newPins.filter((p) => {
      const before = previousPins.find((pp) => pp.id === p.id);
      return before && (before.dayIndex !== p.dayIndex || before.position !== p.position);
    });

    try {
      await Promise.all(
        changed.map((p) =>
          tripPointService.update(tripId, p.id, {
            name: p.name, dayIndex: p.dayIndex, position: p.position,
          })
        )
      );
    } catch (err) {
      setPins(previousPins);
      setError(err.message);
    }
  };

  if (isLoading) return <div className={styles.status}>Ładowanie wycieczki</div>;
  if (error) return <div className={styles.status}>Błąd: {error}</div>;
  if (!trip) return <div className={styles.status}>Nie znaleziono wycieczki.</div>;

  return (
    <div className={styles.page}>
      <PanelGroup direction="horizontal" autoSaveId="planner-layout" className={styles.panelGroup}>
        {/* Mapa */}
        <Panel defaultSize={60} minSize={30} className={styles.mapPanel}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className={styles.map}
          >
            <BaseLayerSwitcher />
            <LocateButton />
            <GeoSearchField
              onResult={handleSearchResult}
              onPoiResults={setPois}
              onPoiMessage={setPoiMessage}
            />
            <FitToPinsButton pins={pins} />
            {/*
            <SearchAreaButton onSearch={handleSearchArea} onClear={handleClearPois} />
            */}
            <PoiStatusControl message={poiMessage} />
  
            {pois.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={getPoiIcon(poi.category)}
              >
                <Popup>
                  <PoiPopupContent poi={poi} />
                </Popup>
              </Marker>
            ))}

            {pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.latitude, pin.longitude]}
                icon={getPinIcon(pin.dayIndex, endpointPinIds.has(pin.id))}
              >
                <Popup>
                  <MarkerPopupContent
                    pin={pin}
                    onAddPin={handleCreatePin}
                    onEdit={handleRename}
                    onDelete={handleDelete}
                  />
                </Popup>
              </Marker>
            ))}

            {contextMenuPos && (
              <EmptyContextMenu
                position={contextMenuPos}
                onAddPin={handleCreatePin}
                onClose={() => setContextMenuPos(null)}
              />
            )}
  
            <MapClickHandler
              onEmptyClick={handleEmptyMapClick}
              contextMenuOpen={contextMenuPos !== null}
            />
            <ResizeAware />
            <CursorTracker onMove={updateCursor} onLeave={clearCursor} />
            <RemoteCursors others={others} />
            <PresenceBar others={present} />
          </MapContainer>
        </Panel>

        {/* Bar */}
        <PanelResizeHandle className={styles.resizeHandle}>
          <div className={styles.resizeGrip} />
        </PanelResizeHandle>

        {/* Boxy */}
        <Panel defaultSize={40} minSize={20} className={styles.daysPanel}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.daysList}>
              {buckets.map((bucket) => (
                <Bucket
                  key={bucket.key}
                  bucket={bucket}
                  pins={pinsByBucket[bucket.key] || []}
                  onRename={handleRename}
                />
              ))}
            </div>
          </DndContext>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default PlannerPage;
