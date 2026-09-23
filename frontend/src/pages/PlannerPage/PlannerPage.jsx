import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { tripPointService } from '../../services/TripPointService';
import { overpassService, POI_CATEGORIES, POI_MIN_ZOOM, matchPoiCategory } from '../../services/OverpassService';
import { MapContainer, Marker, Marker as LeafletMarker, Popup, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
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
import '@fortawesome/fontawesome-free/css/v4-shims.min.css';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import {
  DndContext,
  DragOverlay,
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
import DayRoutes from './DayRoutes';
import styles from './PlannerPage.module.scss';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useTripPointsRealtime } from '../../hooks/useTripPointsRealtime';
import useAuth from '../../hooks/useAuth';
import { useTripPresence } from '../../hooks/useTripPresence';
import { colorForUser } from '../../utils/useColor';
import { swalConfirmDelete } from '../../utils/swal';

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
const FOCUS_ZOOM = 15;

const DAY_MARKER_COLORS = [
  '#2f6f9f',
  '#3f8f5f',
  '#c97b1f',
  '#7a4f9c',
  '#b4443c',
  '#2f8f8f',
  '#6f7f2f',
  '#1f5f7f',
  '#8f3f6f',
  '#7f4a2f',
];

const UNASSIGNED_MARKER_COLOR = '#6f6f6f';
const PIN_MARKER_WIDTH = 32;
const PIN_MARKER_HEIGHT = 44;
const PIN_HEAD_CENTER_Y = 15;
const PIN_RING_RADIUS = 10;
const PIN_DISC_RADIUS = 8;
const PIN_LETTER_OFFSET_X = -0.6;
const POPUP_CLOSE_CLICK_GRACE_MS = 150;
const GEOSEARCH_RESULT_LIMIT = 10;
const SEARCH_BAR_RIGHT_GUTTER = 260;

const markerIconCache = new Map();

const markerColorForDay = (dayIndex) =>
  dayIndex === null || dayIndex === undefined
    ? UNASSIGNED_MARKER_COLOR
    : DAY_MARKER_COLORS[dayIndex % DAY_MARKER_COLORS.length];

const pinLetter = (userName) => (userName || '?').trim().charAt(0).toUpperCase() || '?';

const getPinIcon = (dayIndex, userId, userName) => {
  const dayColor = markerColorForDay(dayIndex);
  const userColor = colorForUser(userId);
  const letter = pinLetter(userName);
  const cacheKey = `pin:${dayColor}:${userColor}:${letter}:${PIN_LETTER_OFFSET_X}`;

  if (!markerIconCache.has(cacheKey)) {
    markerIconCache.set(
      cacheKey,
      L.divIcon({
        className: '',
        html:
          `<svg width="${PIN_MARKER_WIDTH}" height="${PIN_MARKER_HEIGHT}" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">` +
          `<path d="M16 2 C8.8 2 3 7.8 3 15 C3 25.5 16 42 16 42 C16 42 29 25.5 29 15 C29 7.8 23.2 2 16 2 Z" fill="${dayColor}"/>` +
          `<circle cx="16" cy="${PIN_HEAD_CENTER_Y}" r="${PIN_RING_RADIUS}" fill="#ffffff"/>` +
          `<circle cx="16" cy="${PIN_HEAD_CENTER_Y}" r="${PIN_DISC_RADIUS}" fill="${userColor}"/>` +
          `<text x="${16 + PIN_LETTER_OFFSET_X}" y="${PIN_HEAD_CENTER_Y}" text-anchor="middle" dominant-baseline="central" ` +
          `font-family="inherit" font-size="11" font-weight="700" letter-spacing="0" fill="#ffffff">${letter}</text>` +
          `</svg>`,
        iconSize: [PIN_MARKER_WIDTH, PIN_MARKER_HEIGHT],
        iconAnchor: [PIN_MARKER_WIDTH / 2, PIN_MARKER_HEIGHT],
        popupAnchor: [0, -PIN_MARKER_HEIGHT + 6],
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

//odmiana liczebników w pasku panelu dni (1 miejsce / 2 miejsca / 5 miejsc)
const pluralRules = new Intl.PluralRules('pl-PL');
const PLACE_FORMS = { one: 'miejsce', few: 'miejsca', many: 'miejsc', other: 'miejsca' };
const DAY_FORMS = { one: 'dzień', few: 'dni', many: 'dni', other: 'dnia' };
const UNASSIGNED_FORMS = { one: 'nieprzypisane', few: 'nieprzypisane', many: 'nieprzypisanych', other: 'nieprzypisanego' };
const pluralize = (count, forms) => `${count} ${forms[pluralRules.select(count)] ?? forms.many}`;

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

const MENU_WIDTH = 200;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

const PinCardMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      setOpen(false);
      return;
    }
    const height = menuRef.current?.offsetHeight ?? 0;
    const opensUp = rect.bottom + MENU_GAP + height > window.innerHeight - VIEWPORT_MARGIN;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)
    );
    const top = opensUp
      ? Math.max(VIEWPORT_MARGIN, rect.top - MENU_GAP - height)
      : rect.bottom + MENU_GAP;
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;
    menuRef.current?.querySelector('button')?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      close();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };

    const handleScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      close();
    };
    const handleResize = () => close();

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, close]);

  const handleSelect = (item) => {
    close();
    try {
      item.onSelect?.();
    } catch (err) {}
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-stop-card-click
        className={styles.pinMenuBtn}
        aria-label="Opcje punktu"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <i className="fas fa-ellipsis-vertical" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={styles.pinMenu}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: MENU_WIDTH,
              visibility: position ? 'visible' : 'hidden',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`${styles.pinMenuItem} ${item.danger ? styles.pinMenuItemDanger : ''}`}
                onClick={() => handleSelect(item)}
              >
                <i className={`fas ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

const PinCardPreview = ({ pin, order, color }) => (
  <div className={`${styles.pinCard} ${styles.pinCardOverlay}`}>
    <span className={styles.pinDragHandle} aria-hidden="true">
      <i className="fas fa-grip-vertical" />
    </span>
    <span className={styles.pinOrder} style={{ color, borderColor: color }}>
      {order}
    </span>
    <span className={styles.pinName}>
      {pin.name?.trim() || <em className={styles.pinNamePlaceholder}>Bez nazwy</em>}
    </span>
  </div>
);

//Pojedyncza pinezka w koszyku
const PinCard = ({ pin, onRename, onDelete, onLocate, onHoverChange, order, color, highlighted }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pin.name || '');

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: pin.id,
    disabled: editing,
  });

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

  const handleCardClick = (e) => {
    if (editing) return;
    if (e.target.closest?.('[data-stop-card-click]')) return;
    onLocate(pin);
  };

  const menuItems = [
    { key: 'locate', label: 'Pokaż na mapie', icon: 'fa-location-crosshairs', onSelect: () => onLocate(pin) },
    { key: 'rename', label: 'Zmień nazwę', icon: 'fa-pen', onSelect: () => setEditing(true) },
    { key: 'delete', label: 'Usuń punkt', icon: 'fa-trash', danger: true, onSelect: () => onDelete(pin) },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.pinCard} ${isDragging ? styles.pinCardDragging : ''} ${highlighted ? styles.pinCardHighlighted : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => onHoverChange(pin.id)}
      onMouseLeave={() => onHoverChange(null)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        data-stop-card-click
        className={styles.pinDragHandle}
        aria-label="Przeciągnij punkt"
        {...attributes}
        {...listeners}
      >
        <i className="fas fa-grip-vertical" aria-hidden="true" />
      </button>

      <span className={styles.pinOrder} style={{ color, borderColor: color }}>
        {order}
      </span>

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
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {pin.name?.trim() || <em className={styles.pinNamePlaceholder}>Bez nazwy</em>}
        </span>
      )}

      <PinCardMenu items={menuItems} />
    </div>
  );
};

// todo zmiana na prawdziwe dane trasy, na dole tylko atrapa
const MOCK_ROUTE_DAY_INDEX = 0;
const MOCK_ROUTE_ICON = 'fa-car';
const MOCK_ROUTE_LEGS = [
  { distanceM: 8400, durationS: 720 },
  { distanceM: 2150, durationS: 420 },
  { distanceM: 640, durationS: 540 },
  { distanceM: 12800, durationS: 1080 },
];

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString('pl-PL', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
};

const formatDuration = (seconds) => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};

const RouteLink = ({ leg, dimmed }) => (
  <div className={`${styles.routeLink} ${dimmed ? styles.routeLinkDimmed : ''}`}>
    <span className={styles.routeLinkTrack} />
    <i className={`fas ${MOCK_ROUTE_ICON}`} aria-hidden="true" />
    <span>
      {formatDuration(leg.durationS)} - {formatDistance(leg.distanceM)}
    </span>
  </div>
);

//Koszyk dniia
const Bucket = ({ bucket, pins, collapsed, dragging ,onToggleCollapse, hoveredPinId, onRename, onDeletePin, onLocatePin, onHoverPin }) => {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.key });
  const pinIds = pins.map((p) => p.id);
  const color = markerColorForDay(bucket.dayIndex);
  const isUnassigned = bucket.dayIndex === null;

  const mockLegs =
    bucket.dayIndex === MOCK_ROUTE_DAY_INDEX
      ? pins.slice(1).map((_, i) => MOCK_ROUTE_LEGS[i % MOCK_ROUTE_LEGS.length])
      : [];
  const mockTotals = mockLegs.reduce(
    (acc, leg) => ({
      distanceM: acc.distanceM + leg.distanceM,
      durationS: acc.durationS + leg.durationS,
    }),
    { distanceM: 0, durationS: 0 }
  );

  return (
    <div
      ref={setNodeRef}
      className={`${styles.dayColumn} ${collapsed ? styles.dayColumnCollapsed : ''} ${isOver ? styles.dayColumnOver : ''}`}
    >
      <div className={styles.dayHeader}>
        <span
          className={`${styles.dayBadge} ${isUnassigned ? styles.dayBadgeMuted : ''}`}
          style={{ background: color }}
        >
          {isUnassigned ? '' : bucket.dayIndex + 1}
        </span>
        <div className={styles.dayTitle}>
          <span className={styles.dayName}>{bucket.label}</span>
          {mockLegs.length > 0 && (
            <span className={styles.dayRouteSummary}>
              {formatDuration(mockTotals.durationS)} - {formatDistance(mockTotals.distanceM)}
            </span>
          )}
        </div>
        <span className={styles.dayCount}>{pins.length}</span>
        <button
          type="button"
          className={`${styles.dayToggle} ${collapsed ? styles.dayToggleCollapsed : ''}`}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Rozwiń: ${bucket.label}` : `Zwiń: ${bucket.label}`}
          onClick={() => onToggleCollapse(bucket.key)}
        >
          <i className="fas fa-chevron-down" aria-hidden="true" />
        </button>
      </div>
      {!collapsed && (
        <SortableContext items={pinIds} strategy={verticalListSortingStrategy}>
          <div className={styles.pinList}>
            {pins.length === 0 ? (
              <div className={styles.emptyState}>Brak pinezek</div>
            ) : (
               pins.map((pin, i) => (
                <Fragment key={pin.id}>
                  {mockLegs[i - 1] && <RouteLink leg={mockLegs[i - 1]} dimmed={dragging} />}
                  <PinCard
                    pin={pin}
                    onRename={onRename}
                    onDelete={onDeletePin}
                    onLocate={onLocatePin}
                    onHoverChange={onHoverPin}
                    order={i + 1}
                    color={color}
                    highlighted={pin.id === hoveredPinId}
                  />
                </Fragment>
              ))
            )}
          </div>
        </SortableContext>
      )}
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

  const [map, setMap] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [activeDragPin, setActiveDragPin] = useState(null);
  const markerRefs = useRef(new Map());
  const pendingLocateRef = useRef(null);
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());

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

  const routeDays = useMemo(
    () =>
      buckets
        .filter((bucket) => bucket.dayIndex !== null)
        .map((bucket) => ({
          key: bucket.key,
          label: bucket.label,
          color: markerColorForDay(bucket.dayIndex),
          points: (pinsByBucket[bucket.key] || []).map((pin) => ({
            lat: pin.latitude,
            lng: pin.longitude,
          })),
        }))
        .filter((day) => day.points.length >= 2),
    [buckets, pinsByBucket]
  );

  const hoveredPin = useMemo(
    () => (hoveredPinId ? pins.find((p) => p.id === hoveredPinId) ?? null : null),
    [hoveredPinId, pins]
  );

  const activeDragMeta = useMemo(() => {
    if (!activeDragPin) return null;
    const group = pinsByBucket[bucketKeyFromDayIndex(activeDragPin.dayIndex)] || [];
    const index = group.findIndex((p) => p.id === activeDragPin.id);
    return {
      order: index === -1 ? group.length + 1 : index + 1,
      color: markerColorForDay(activeDragPin.dayIndex),
    };
  }, [activeDragPin, pinsByBucket]);

  const setMarkerRef = (pinId) => (instance) => {
    if (instance) markerRefs.current.set(pinId, instance);
    else markerRefs.current.delete(pinId);
  };

  const locatePin = (pin) => {
    if (!map || pin?.latitude == null || pin?.longitude == null) return;

    const target = L.latLng(pin.latitude, pin.longitude);
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
    const openPopup = () => markerRefs.current.get(pin.id)?.openPopup();

    if (pendingLocateRef.current) {
      map.off('moveend', pendingLocateRef.current);
      pendingLocateRef.current = null;
    }

    if (map.getCenter().distanceTo(target) < 1 && map.getZoom() === zoom) {
      openPopup();
      return;
    }

    const handler = () => {
      pendingLocateRef.current = null;
      openPopup();
    };
    pendingLocateRef.current = handler;
    map.once('moveend', handler);
    map.flyTo(target, zoom, { duration: 0.6 });
  };

  useEffect(() => {
    if (!map) return undefined;
    return () => {
      if (pendingLocateRef.current) {
        map.off('moveend', pendingLocateRef.current);
        pendingLocateRef.current = null;
      }
    };
  }, [map]);

  const toggleBucket = (key) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allCollapsed = buckets.every((b) => collapsedKeys.has(b.key));

  const toggleAllBuckets = () => {
    setCollapsedKeys(allCollapsed ? new Set() : new Set(buckets.map((b) => b.key)));
  };

  const panelSummary = useMemo(() => {
    const placed = Object.values(pinsByBucket).reduce((sum, group) => sum + group.length, 0);
    const dayCount = buckets.length - 1;
    const unassigned = pinsByBucket[UNASSIGNED_KEY]?.length ?? 0;
    const parts = [pluralize(placed, PLACE_FORMS)];
    if (dayCount > 0) parts.push(pluralize(dayCount, DAY_FORMS));
    if (unassigned > 0) parts.push(pluralize(unassigned, UNASSIGNED_FORMS));
    return parts.join(' - ');
  }, [pinsByBucket, buckets]);

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
      setCollapsedKeys((prev) => {
        if (!prev.has(UNASSIGNED_KEY)) return prev;
        const next = new Set(prev);
        next.delete(UNASSIGNED_KEY);
        return next;
      });
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

  const confirmAndDelete = async (pin) => {
    const result = await swalConfirmDelete(
      'Usunąć punkt?',
      `„${pin.name?.trim() || 'Bez nazwy'}” zniknie z planu dla wszystkich uczestników.`
    );
    if (!result.isConfirmed) return;
    await handleDelete(pin.id);
  };

  const handleDragStart = (event) => {
    setActiveDragPin(pins.find((p) => p.id === event.active.id) ?? null);
    setHoveredPinId(null);
  };

  const handleDragCancel = () => setActiveDragPin(null);

  const handleDragEnd = async (event) => {
    setActiveDragPin(null);
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
            ref={setMap}
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
            <DayRoutes days={routeDays} />
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

            {hoveredPin && (
              <CircleMarker
                center={[hoveredPin.latitude, hoveredPin.longitude]}
                radius={18}
                interactive={false}
                pathOptions={{
                  color: markerColorForDay(hoveredPin.dayIndex),
                  weight: 3,
                  opacity: 0.9,
                  fillOpacity: 0.15,
                }}
              />
            )}

            {pins.map((pin) => (
              <Marker
                key={pin.id}
                ref={setMarkerRef(pin.id)}
                position={[pin.latitude, pin.longitude]}
                icon={getPinIcon(pin.dayIndex, pin.userId, pin.userName)}
                eventHandlers={{
                  mouseover: () => setHoveredPinId(pin.id),
                  mouseout: () => setHoveredPinId((c) => (c === pin.id ? null : c)),
                }}
              >
                <Popup>
                  <MarkerPopupContent
                    pin={pin}
                    onAddPin={handleCreatePin}
                    onEdit={handleRename}
                    onDelete={() => confirmAndDelete(pin)}
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
          <div className={styles.daysToolbar}>
            <span className={styles.daysSummary}>{panelSummary}</span>
            <button type="button" className={styles.daysToolbarBtn} onClick={toggleAllBuckets}>
              {allCollapsed ? 'Rozwiń wszystkie' : 'Zwiń wszystkie'}
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className={styles.daysList}>
              {buckets.map((bucket) => (
                <Bucket
                  key={bucket.key}
                  bucket={bucket}
                  pins={pinsByBucket[bucket.key] || []}
                  collapsed={collapsedKeys.has(bucket.key)}
                  dragging={activeDragPin !== null}
                  onToggleCollapse={toggleBucket}
                  hoveredPinId={hoveredPinId}
                  onRename={handleRename}
                  onDeletePin={confirmAndDelete}
                  onLocatePin={locatePin}
                  onHoverPin={setHoveredPinId}
                />
              ))}
            </div>
            {createPortal(
              <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
                {activeDragPin ? (
                  <PinCardPreview
                    pin={activeDragPin}
                    order={activeDragMeta?.order ?? 1}
                    color={activeDragMeta?.color}
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default PlannerPage;