import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import '../../leafletGlobals';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-providers';
import 'leaflet-easybutton';
import 'leaflet-easybutton/src/easy-button.css';
import { MapContainer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import BaseLayerSwitcher from '../PlannerPage/BaseLayerSwitcher';
import DayRoutes from '../PlannerPage/DayRoutes';
import { exploreService } from '../../services/ExploreService';
import useAuth from '../../hooks/useAuth';
import { swalError, toastSuccess } from '../../utils/swal';
import { PUBLICATION_TAG_LABELS } from '../../utils/publicationTags';
import { pluralize, PLACE_FORMS, DAY_FORMS } from '../../utils/pluralize';
import { formatDistance, formatDuration } from '../../utils/routeFormat';
import { dayColor } from '../../utils/dayColors';
import { createPinIcon } from '../../utils/pinIcon';
import CopyTripDialog from './CopyTripDialog';
import plannerStyles from '../PlannerPage/PlannerPage.module.scss';
import styles from './ExploreTripPage.module.scss';

const FIT_PADDING = [40, 40];
const FIT_MAX_ZOOM = 15;
const POINT_ZOOM = 15;
const FLY_DURATION_S = 0.6;
const FALLBACK_CENTER = [52.07, 19.48];
const FALLBACK_ZOOM = 6;
const ROUTE_ICON = 'fa-car';
const DESCRIPTION_CLAMP_CHARS = 240;
const NARROW_QUERY = '(max-width: 900px)';

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const subscribeNarrow = (callback) => {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const useIsNarrow = () => useSyncExternalStore(subscribeNarrow, getNarrow);

const toggleInSet = (setter) => (key) =>
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

const pointIcon = (dayIndex, order) =>
  createPinIcon({
    color: dayColor(dayIndex),
    discColor: '#ffffff',
    textColor: dayColor(dayIndex),
    label: order,
  });

const FitToBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds?.isValid()) map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM });
  }, [map, bounds]);
  return null;
};

const ResizeAware = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const RouteLink = ({ leg }) => (
  <div className={plannerStyles.routeLink}>
    <span className={plannerStyles.routeLinkTrack} />
    <i className={`fas ${ROUTE_ICON}`} aria-hidden="true" />
    <span>
      {formatDuration(leg.time)} - {formatDistance(leg.distance)}
    </span>
  </div>
);

const ReadOnlyDay = ({
  day,
  route,
  collapsed,
  hiddenOnMap,
  hoveredKey,
  onToggleCollapse,
  onToggleVisibility,
  onFocusDay,
  onFocusPoint,
  onHoverPoint,
}) => {
  const color = dayColor(day.index);
  const legs = route?.legs?.length === day.points.length - 1 ? route.legs : [];

  return (
    <div className={`${plannerStyles.dayColumn} ${collapsed ? plannerStyles.dayColumnCollapsed : ''}`}>
      <div className={plannerStyles.dayHeader}>
        <span className={plannerStyles.dayBadge} style={{ background: color }}>
          {day.dayNumber}
        </span>

        <button
          type="button"
          className={styles.dayFocus}
          disabled={day.points.length === 0}
          title="Pokaż dzień na mapie"
          onClick={() => onFocusDay(day)}>
          <span className={plannerStyles.dayName}>Dzień {day.dayNumber}</span>
          {legs.length > 0 && (
            <span className={plannerStyles.dayRouteSummary}>
              {formatDuration(route.time)} - {formatDistance(route.distance)}
            </span>
          )}
        </button>

        <span className={plannerStyles.dayCount}>{day.points.length}</span>

        <button
          type="button"
          className={plannerStyles.dayToggle}
          aria-pressed={hiddenOnMap}
          aria-label={hiddenOnMap ? `Pokaż na mapie: dzień ${day.dayNumber}` : `Ukryj na mapie: dzień ${day.dayNumber}`}
          title={hiddenOnMap ? 'Pokaż na mapie' : 'Ukryj na mapie'}
          onClick={() => onToggleVisibility(day.key)}>
          <i className={`fas ${hiddenOnMap ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`${plannerStyles.dayToggle} ${collapsed ? plannerStyles.dayToggleCollapsed : ''}`}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Rozwiń: dzień ${day.dayNumber}` : `Zwiń: dzień ${day.dayNumber}`}
          onClick={() => onToggleCollapse(day.key)}>
          <i className="fas fa-chevron-down" aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <div className={plannerStyles.pinList}>
          {day.points.length === 0 ? (
            <div className={plannerStyles.emptyState}>Dzień bez zaplanowanych miejsc</div>
          ) : (
            day.points.map((point, i) => (
              <Fragment key={point.key}>
                {legs[i - 1] && <RouteLink leg={legs[i - 1]} />}
                <button
                  type="button"
                  className={`${plannerStyles.pinCard} ${styles.pinButton} ${
                    hoveredKey === point.key ? plannerStyles.pinCardHighlighted : ''
                  }`}
                  onClick={() => onFocusPoint(day, i)}
                  onMouseEnter={() => onHoverPoint(point.key)}
                  onMouseLeave={() => onHoverPoint(null)}>
                  <span className={styles.cardSpacer} aria-hidden="true" />
                  <span className={plannerStyles.pinOrder} style={{ color, borderColor: color }}>
                    {i + 1}
                  </span>
                  <span className={plannerStyles.pinName}>
                    {point.name?.trim() || <em className={plannerStyles.pinNamePlaceholder}>Bez nazwy</em>}
                  </span>
                </button>
              </Fragment>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ExploreTripPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const isNarrow = useIsNarrow();

  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ key: null, trip: null, error: null });
  const [map, setMap] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());
  const [hiddenDayKeys, setHiddenDayKeys] = useState(() => new Set());
  const [routeData, setRouteData] = useState({});
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const markerRefs = useRef(new Map());
  const pendingFocusRef = useRef(null);
  const hiddenDayKeysRef = useRef(hiddenDayKeys);

  const requestKey = `${id}|${reloadToken}`;
  const isLoading = result.key !== requestKey;
  const trip = isLoading ? null : result.trip;

  const isCopyOpen = Boolean(trip) && isAuthenticated && searchParams.get('copy') === '1';

  useEffect(() => {
    const key = `${id}|${reloadToken}`;
    const controller = new AbortController();

    exploreService
      .getTrip(id, { signal: controller.signal })
      .then((data) => setResult({ key, trip: data, error: null }))
      .catch((err) => {
        if (err.canceled) return;
        setResult({ key, trip: null, error: err });
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  useEffect(() => {
    if (!trip) return undefined;
    const previous = document.title;
    document.title = `${trip.title} - TripDrop`;
    return () => {
      document.title = previous;
    };
  }, [trip]);

  useEffect(() => {
    if (!map) return undefined;
    return () => {
      if (pendingFocusRef.current) {
        map.off('moveend', pendingFocusRef.current);
        pendingFocusRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    hiddenDayKeysRef.current = hiddenDayKeys;
  }, [hiddenDayKeys]);

  const days = useMemo(
    () =>
      (trip?.days ?? []).map((day) => {
        const index = day.dayNumber - 1;
        return {
          ...day,
          index,
          key: String(index),
          points: day.points.map((point, i) => ({ ...point, key: `${index}-${i}` })),
          positions: day.points.map((point) => [point.lat, point.lng]),
        };
      }),
    [trip],
  );

  const allBounds = useMemo(() => {
    const positions = days.flatMap((day) => day.positions);
    return positions.length ? L.latLngBounds(positions) : null;
  }, [days]);

  const routeDays = useMemo(
    () =>
      days
        .filter((day) => !hiddenDayKeys.has(day.key) && day.points.length >= 2)
        .map((day) => ({
          key: day.key,
          label: `Dzień ${day.dayNumber}`,
          color: dayColor(day.index),
          points: day.points.map((point) => ({
            id: point.key,
            name: point.name?.trim() || 'Bez nazwy',
            lat: point.lat,
            lng: point.lng,
          })),
        })),
    [days, hiddenDayKeys],
  );

  const handleRoutesComputed = useCallback((dayKey, data) => {
    setRouteData((prev) => {
      if (!data) {
        if (!prev[dayKey] || hiddenDayKeysRef.current.has(dayKey)) return prev;
        const next = { ...prev };
        delete next[dayKey];
        return next;
      }
      return { ...prev, [dayKey]: data };
    });
  }, []);

  const routeTotals = useMemo(() => {
    const routable = days.filter((day) => day.points.length >= 2);
    if (routable.length === 0 || !routable.every((day) => routeData[day.key])) return null;
    return routable.reduce(
      (acc, day) => ({
        distance: acc.distance + routeData[day.key].distance,
        time: acc.time + routeData[day.key].time,
      }),
      { distance: 0, time: 0 },
    );
  }, [days, routeData]);

  const hoveredPoint = useMemo(() => {
    if (!hoveredKey) return null;
    for (const day of days) {
      const point = day.points.find((p) => p.key === hoveredKey);
      if (point) return { ...point, dayIndex: day.index, dayKey: day.key };
    }
    return null;
  }, [hoveredKey, days]);

  const toggleCollapsed = toggleInSet(setCollapsedKeys);
  const toggleHidden = toggleInSet(setHiddenDayKeys);
  const allCollapsed = days.length > 0 && days.every((day) => collapsedKeys.has(day.key));
  const toggleAllCollapsed = () => setCollapsedKeys(allCollapsed ? new Set() : new Set(days.map((day) => day.key)));

  const setMarkerRef = (key) => (instance) => {
    if (instance) markerRefs.current.set(key, instance);
    else markerRefs.current.delete(key);
  };

  const revealMap = () => {
    map?.getContainer().scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const focusDay = (day) => {
    if (!map || day.positions.length === 0) return;
    revealMap();
    map.flyToBounds(L.latLngBounds(day.positions), {
      padding: FIT_PADDING,
      maxZoom: FIT_MAX_ZOOM,
      duration: FLY_DURATION_S,
    });
  };

  const focusPoint = (day, pointIndex) => {
    if (!map) return;

    const point = day.points[pointIndex];
    const target = L.latLng(point.lat, point.lng);
    const zoom = Math.max(map.getZoom(), POINT_ZOOM);
    const openPopup = () => markerRefs.current.get(point.key)?.openPopup();

    if (pendingFocusRef.current) {
      map.off('moveend', pendingFocusRef.current);
      pendingFocusRef.current = null;
    }

    if (hiddenDayKeys.has(day.key)) toggleHidden(day.key);

    revealMap();

    if (map.getCenter().distanceTo(target) < 1 && map.getZoom() === zoom) {
      openPopup();
      return;
    }

    const handler = () => {
      pendingFocusRef.current = null;
      openPopup();
    };
    pendingFocusRef.current = handler;
    map.once('moveend', handler);
    map.flyTo(target, zoom, { duration: FLY_DURATION_S });
  };

  const cameFromApp = location.key !== 'default';
  const handleBack = () => (cameFromApp ? navigate(-1) : navigate('/explore'));

  const handleCopyClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/explore/${id}?copy=1` } });
      return;
    }
    setSearchParams({ copy: '1' }, { replace: true });
  };

  const closeCopyDialog = () => setSearchParams({}, { replace: true });

  const handleShare = async () => {
    const url = `${window.location.origin}/explore/${id}`;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice && navigator.share) {
      try {
        await navigator.share({ title: trip.title, url });
      } catch (err) {
        if (err.name !== 'AbortError') swalError('Nie udało się udostępnić', url);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Skopiowano link.');
    } catch {
      swalError('Nie udało się skopiować', url);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Ładowanie trasy…</div>;
  }

  if (result.error) {
    const { status, message } = result.error;
    const isGone = status === 410;
    const isMissing = status === 404;

    return (
      <div className={styles.state}>
        <h1 className={styles.stateTitle}>
          {isGone ? 'Trasa została wycofana' : isMissing ? 'Nie znaleziono trasy' : 'Coś poszło nie tak'}
        </h1>
        <p>
          {isGone
            ? message
            : isMissing
              ? 'Link może być błędny albo trasa nigdy nie istniała.'
              : `Nie udało się wczytać trasy: ${message}`}
        </p>
        <div className={styles.stateActions}>
          {!isGone && !isMissing && (
            <button type="button" className={styles.secondaryBtn} onClick={() => setReloadToken((token) => token + 1)}>
              Spróbuj ponownie
            </button>
          )}
          <Link to="/explore" className={styles.secondaryBtn}>
            Przeglądaj inne trasy
          </Link>
        </div>
      </div>
    );
  }

  const pointCount = days.reduce((sum, day) => sum + day.points.length, 0);
  const summary = [
    pluralize(days.length, DAY_FORMS),
    pluralize(pointCount, PLACE_FORMS),
    routeTotals ? formatDistance(routeTotals.distance) : null,
    routeTotals ? formatDuration(routeTotals.time) : null,
  ]
    .filter(Boolean)
    .join(' - ');

  const isLongDescription = (trip.description?.length ?? 0) > DESCRIPTION_CLAMP_CHARS;

  const mapNode = (
    <MapContainer ref={setMap} center={FALLBACK_CENTER} zoom={FALLBACK_ZOOM} className={plannerStyles.map}>
      <BaseLayerSwitcher />
      <DayRoutes days={routeDays} onRoutesComputed={handleRoutesComputed} />
      <FitToBounds bounds={allBounds} />
      <ResizeAware />

      {hoveredPoint && !hiddenDayKeys.has(hoveredPoint.dayKey) && (
        <CircleMarker
          center={[hoveredPoint.lat, hoveredPoint.lng]}
          radius={18}
          interactive={false}
          pathOptions={{
            color: dayColor(hoveredPoint.dayIndex),
            weight: 3,
            opacity: 0.9,
            fillOpacity: 0.15,
          }}
        />
      )}

      {days
        .filter((day) => !hiddenDayKeys.has(day.key))
        .flatMap((day) =>
          day.points.map((point, i) => (
            <Marker
              key={point.key}
              ref={setMarkerRef(point.key)}
              position={[point.lat, point.lng]}
              icon={pointIcon(day.index, i + 1)}
              eventHandlers={{
                mouseover: () => setHoveredKey(point.key),
                mouseout: () => setHoveredKey((current) => (current === point.key ? null : current)),
              }}>
              <Popup>
                <div className={plannerStyles.popup}>
                  <div className={plannerStyles.popupName}>{point.name?.trim() || 'Bez nazwy'}</div>
                  <div className={styles.popupMeta}>
                    Dzień {day.dayNumber} - punkt {i + 1}
                  </div>
                </div>
              </Popup>
            </Marker>
          )),
        )}
    </MapContainer>
  );

  const panelNode = (
    <div className={`${styles.panelScroll} ${isNarrow ? styles.panelScrollStacked : ''}`}>
      <header className={styles.intro}>
        <button type="button" className={styles.back} onClick={handleBack}>
          <FontAwesomeIcon icon="arrow-left" /> {cameFromApp ? 'Wróć' : 'Wszystkie trasy'}
        </button>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>{trip.title}</h1>
          <span className={styles.readOnlyChip} title="Edycja jest dostępna po skopiowaniu trasy do swoich wycieczek">
            <FontAwesomeIcon icon="lock" /> Podgląd
          </span>
        </div>

        {trip.isMine && trip.visibility === 'unlisted' && <span className={styles.badge}>Tylko przez link</span>}

        <p className={styles.byline}>{[`@${trip.author}`, trip.region].filter(Boolean).join(' - ')}</p>

        {trip.tags.length > 0 && (
          <div className={styles.tags}>
            {trip.tags.map((key) => (
              <span key={key} className={styles.tag}>
                {PUBLICATION_TAG_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleCopyClick}>
            <FontAwesomeIcon icon="copy" /> Skopiuj do moich wycieczek
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleShare}>
            <FontAwesomeIcon icon="share-nodes" /> Udostępnij
          </button>
          {trip.isMine && trip.manageTripId && (
            <Link to={`/trips/${trip.manageTripId}/manage`} className={styles.secondaryBtn}>
              <FontAwesomeIcon icon="pen" /> Zarządzaj
            </Link>
          )}
        </div>

        {trip.description && (
          <div>
            <p
              className={`${styles.description} ${
                isLongDescription && !descriptionOpen ? styles.descriptionClamped : ''
              }`}>
              {trip.description}
            </p>
            {isLongDescription && (
              <button type="button" className={styles.linkBtn} onClick={() => setDescriptionOpen((open) => !open)}>
                {descriptionOpen ? 'Zwiń opis' : 'Pokaż cały opis'}
              </button>
            )}
          </div>
        )}

        <p className={styles.footnote}>
          Opublikowano {dateFormatter.format(new Date(trip.publishedAt))}
          {trip.updatedAt ? `, zaktualizowano ${dateFormatter.format(new Date(trip.updatedAt))}` : ''}
          {trip.copyCount > 0 ? ` - Skopiowano: ${trip.copyCount}` : ''}
        </p>
      </header>

      <div className={`${plannerStyles.daysToolbar} ${styles.stickyToolbar}`}>
        <span className={plannerStyles.daysSummary}>{summary}</span>
        <button type="button" className={plannerStyles.daysToolbarBtn} onClick={toggleAllCollapsed}>
          {allCollapsed ? 'Rozwiń wszystkie' : 'Zwiń wszystkie'}
        </button>
      </div>

      <div className={styles.daysList}>
        {days.map((day) => (
          <ReadOnlyDay
            key={day.key}
            day={day}
            route={routeData[day.key]}
            collapsed={collapsedKeys.has(day.key)}
            hiddenOnMap={hiddenDayKeys.has(day.key)}
            hoveredKey={hoveredKey}
            onToggleCollapse={toggleCollapsed}
            onToggleVisibility={toggleHidden}
            onFocusDay={focusDay}
            onFocusPoint={focusPoint}
            onHoverPoint={setHoveredKey}
          />
        ))}
      </div>
    </div>
  );

  const copyDialog = isCopyOpen && <CopyTripDialog trip={trip} onClose={closeCopyDialog} />;

  if (isNarrow) {
    return (
      <div className={styles.stack}>
        <div className={styles.stackMap}>{mapNode}</div>
        {panelNode}
        {copyDialog}
      </div>
    );
  }

  return (
    <div className={plannerStyles.page}>
      <PanelGroup direction="horizontal" autoSaveId="explore-layout" className={plannerStyles.panelGroup}>
        <Panel defaultSize={60} minSize={30} className={plannerStyles.mapPanel}>
          {mapNode}
        </Panel>

        <PanelResizeHandle className={plannerStyles.resizeHandle}>
          <div className={plannerStyles.resizeGrip} />
        </PanelResizeHandle>

        <Panel defaultSize={40} minSize={25} className={plannerStyles.daysPanel}>
          {panelNode}
        </Panel>
      </PanelGroup>
      {copyDialog}
    </div>
  );
};

export default ExploreTripPage;
