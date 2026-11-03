import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import styles from './PlannerPage.module.scss';

const OSRM_SERVICE_URL = 'https://router.project-osrm.org/route/v1';
const ROUTE_PROFILE = 'driving';
const ROUTE_WEIGHT = 5;
const ROUTE_OPACITY = 0.75;
const ROUTE_HOVER_WEIGHT = 8;
const ROUTE_CASING_COLOR = '#0a0a0a';
const ROUTE_CASING_WEIGHT = 12;
const ROUTE_CASING_OPACITY = 0.85;
const ROUTE_DEBOUNCE_MS = 600;
const MAX_CONCURRENT_ROUTES = 2;
const ROUTE_CACHE_LIMIT = 60;
const COORD_PRECISION = 5;
const MAX_WAYPOINT_SNAP_M = 25000;
const ROUTE_ERROR_UNREACHABLE = 'Brak połączenia drogowego';
const ROUTE_ERROR_FAILED = 'Nie udało się wyznaczyć trasy';
const ROUTE_ERROR_PARTIAL =
  'Nie można wyznaczyć całej trasy';

const formatDistance = (meters) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
};

const signatureFor = (day) =>
  `${day.color}|${day.points
    .map((point) => `${point.lat.toFixed(COORD_PRECISION)},${point.lng.toFixed(COORD_PRECISION)}`)
    .join(';')}`;

const toWaypoint = (point) => L.Routing.waypoint(L.latLng(point.lat, point.lng));

const isUnroutable = (err) => {
  const status = err?.target?.status;
  return status >= 400 && status < 500 && status !== 429;
};

const failedLeg = (points, index, message) => ({
  index,
  fromName: points[index]?.name ?? '',
  toName: points[index + 1]?.name ?? '',
  error: message,
});

const combineLegs = (legs) => {
  const partial = legs.some((leg) => leg.error);
  return {
    legs,
    partial,
    distance: partial ? null : legs.reduce((sum, leg) => sum + leg.distance, 0),
    time: partial ? null : legs.reduce((sum, leg) => sum + leg.time, 0),
  };
};

const findMisplacedPoint = (route, points) => {
  const snapped = route.waypoints ?? [];

  return (
    points.find((point, index) => {
      const actual = snapped[index]?.latLng;
      if (!actual) return false;
      return L.latLng(point.lat, point.lng).distanceTo(actual) > MAX_WAYPOINT_SNAP_M;
    }) ?? null
  );
};

const buildLegs = (route, points) => {
  const indices = route.waypointIndices;
  if (!indices || indices.length < 2) return [];

  const legs = [];
  for (let i = 0; i < indices.length - 1; i += 1) {
    const from = indices[i];
    const to = indices[i + 1];
    const steps = route.instructions.filter((step) => step.index >= from && step.index < to);

    legs.push({
      index: i,
      fromName: points[i]?.name ?? '',
      toName: points[i + 1]?.name ?? '',
      coordinates: route.coordinates.slice(from, to + 1),
      distance: steps.reduce((sum, step) => sum + step.distance, 0),
      time: steps.reduce((sum, step) => sum + step.time, 0),
    });
  }
  return legs;
};

const buildResult = (route, points) => {
  const legs = buildLegs(route, points);
  return {
    legs: legs.length
      ? legs
      : [
          {
            index: 0,
            fromName: points[0]?.name ?? '',
            toName: points[points.length - 1]?.name ?? '',
            coordinates: route.coordinates,
            distance: route.summary.totalDistance,
            time: route.summary.totalTime,
          },
        ],
    partial: false,
    distance: route.summary.totalDistance,
    time: route.summary.totalTime,
  };
};

const detailRows = (entries) => entries.filter((entry) => entry.value);

const segmentDetails = (day, leg) => ({
  id: `${day.key}|odcinek|${leg.index}`,
  dayKey: day.key,
  legIndex: leg.index,
  title: day.label,
  scope: 'Odcinek',
  rows: detailRows([
    { term: 'Odcinek', value: `${leg.fromName} - ${leg.toName}` },
    { term: 'Dystans', value: formatDistance(leg.distance) },
    { term: 'Czas', value: formatDuration(leg.time) },
  ]),
});

const routeDetails = (day, result) => ({
  id: `${day.key}|trasa`,
  dayKey: day.key,
  legIndex: null,
  title: day.label,
  scope: 'Cała trasa',
  error: result.partial ? ROUTE_ERROR_PARTIAL : null,
  rows: detailRows([
    {
      term: 'Trasa',
      value: `${day.points[0]?.name ?? ''} - ${day.points[day.points.length - 1]?.name ?? ''}`,
    },
    { term: 'Przystanki', value: String(day.points.length) },
    { term: 'Dystans', value: result.partial ? '' : formatDistance(result.distance) },
    { term: 'Czas', value: result.partial ? '' : formatDuration(result.time) },
  ]),
});

const buildPopupContent = (day, leg, result, line, selectRef) => {
  const container = L.DomUtil.create('div', styles.popup);

  const title = L.DomUtil.create('div', styles.popupName, container);
  title.textContent = day.label;

  const actions = L.DomUtil.create('div', styles.popupActions, container);
  const segmentBtn = L.DomUtil.create('button', '', actions);
  segmentBtn.type = 'button';
  segmentBtn.textContent = 'Dane odcinka';
  const routeBtn = L.DomUtil.create('button', '', actions);
  routeBtn.type = 'button';
  routeBtn.textContent = 'Dane całej trasy';

  L.DomEvent.on(segmentBtn, 'click', (event) => {
    L.DomEvent.stop(event);
    selectRef.current?.(segmentDetails(day, leg));
    line.closePopup();
  });

  L.DomEvent.on(routeBtn, 'click', (event) => {
    L.DomEvent.stop(event);
    selectRef.current?.(routeDetails(day, result));
    line.closePopup();
  });

  return container;
};

const DayRoutes = ({ days, details, onRoutesComputed, onDetailsSelect }) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(false);

  const layersRef = useRef(new Map());
  const cacheRef = useRef(new Map());
  const requestsRef = useRef(new Set());
  const routerRef = useRef(null);
  const timerRef = useRef(null);
  const generationRef = useRef(0);
  const reportRef = useRef(onRoutesComputed);
  const selectRef = useRef(onDetailsSelect);
  const detailsRef = useRef(details);

  useEffect(() => {
    reportRef.current = onRoutesComputed;
  }, [onRoutesComputed]);

  useEffect(() => {
    selectRef.current = onDetailsSelect;
  }, [onDetailsSelect]);

  const abortPending = useCallback(() => {
    requestsRef.current.forEach((request) => {
      try {
        request.abort();
      } catch (err) {
        console.warn('[trasy] Nie udało się anulować żądania:', err?.message ?? err);
      }
    });
    requestsRef.current.clear();
  }, []);

  const applyHighlight = useCallback(() => {
    const selection = detailsRef.current;

    layersRef.current.forEach((entry, key) => {
      entry.lines.forEach(({ index, line, casing }) => {
        const active =
          selection?.dayKey === key &&
          (selection.legIndex === null || selection.legIndex === index);

        casing.setStyle({ opacity: active ? ROUTE_CASING_OPACITY : 0 });

        if (active) {
          casing.bringToFront();
          line.bringToFront();
        }
      });
    });
  }, []);

  useEffect(() => {
    detailsRef.current = details;
    applyHighlight();
  }, [details, applyHighlight]);

  const removeAllLayers = useCallback(() => {
    layersRef.current.forEach(({ group }, key) => {
      if (map.hasLayer(group)) map.removeLayer(group);
      reportRef.current?.(key, null);
    });
    layersRef.current.clear();
  }, [map]);

  const getRouter = useCallback(() => {
    if (!routerRef.current) {
      routerRef.current = L.Routing.osrmv1({
        serviceUrl: OSRM_SERVICE_URL,
        profile: ROUTE_PROFILE,
      });
    }
    return routerRef.current;
  }, []);

  const drawDay = useCallback(
    (day, signature, result) => {
      const previous = layersRef.current.get(day.key);
      if (previous && map.hasLayer(previous.group)) map.removeLayer(previous.group);

      const group = L.layerGroup();
      const lines = [];

      result.legs.forEach((leg) => {
        if (leg.error) return;

        const casing = L.polyline(leg.coordinates, {
          color: ROUTE_CASING_COLOR,
          weight: ROUTE_CASING_WEIGHT,
          opacity: 0,
          interactive: false,
        });

        const line = L.polyline(leg.coordinates, {
          color: day.color,
          weight: ROUTE_WEIGHT,
          opacity: ROUTE_OPACITY,
        });

        line.bindTooltip(
          `${leg.fromName} - ${leg.toName} - ${formatDistance(leg.distance)}, ${formatDuration(leg.time)}`,
          { sticky: true }
        );

        line.bindPopup(() => buildPopupContent(day, leg, result, line, selectRef));

        line.on('mouseover', () => line.setStyle({ weight: ROUTE_HOVER_WEIGHT }));
        line.on('mouseout', () => line.setStyle({ weight: ROUTE_WEIGHT }));

        group.addLayer(casing);
        group.addLayer(line);
        lines.push({ index: leg.index, line, casing });
      });

      group.addTo(map);
      layersRef.current.set(day.key, { group, signature, lines });
      applyHighlight();

      reportRef.current?.(day.key, {
        legs: result.legs.map((leg) => ({
          index: leg.index,
          fromName: leg.fromName,
          toName: leg.toName,
          distance: leg.distance,
          time: leg.time,
          error: leg.error ?? null,
        })),
        partial: Boolean(result.partial),
        distance: result.distance,
        time: result.time,
      });
    },
    [map, applyHighlight]
  );

  const rejectDay = useCallback(
    (day, signature, error) => {
      const previous = layersRef.current.get(day.key);
      if (previous && map.hasLayer(previous.group)) map.removeLayer(previous.group);

      layersRef.current.set(day.key, { group: L.layerGroup(), signature, lines: [] });
      reportRef.current?.(day.key, { error });
    },
    [map]
  );

  const routeLegsSeparately = useCallback(
    (day, generation, done) => {
      if (day.points.length === 2) {
        done(combineLegs([failedLeg(day.points, 0, ROUTE_ERROR_UNREACHABLE)]));
        return;
      }

      const legs = [];

      const next = (index) => {
        if (generationRef.current !== generation) return;
        if (index >= day.points.length - 1) {
          done(combineLegs(legs));
          return;
        }

        const pair = day.points.slice(index, index + 2);
        const request = getRouter().route(pair.map(toWaypoint), (err, routes) => {
          requestsRef.current.delete(request);
          if (generationRef.current !== generation) return;

          const route = routes?.[0];
          if (err || !route) {
            legs.push(
              failedLeg(day.points, index, isUnroutable(err) ? ROUTE_ERROR_UNREACHABLE : ROUTE_ERROR_FAILED)
            );
          } else if (findMisplacedPoint(route, pair)) {
            legs.push(failedLeg(day.points, index, ROUTE_ERROR_UNREACHABLE));
          } else {
            legs.push({
              index,
              fromName: pair[0].name,
              toName: pair[1].name,
              coordinates: route.coordinates,
              distance: route.summary.totalDistance,
              time: route.summary.totalTime,
            });
          }

          next(index + 1);
        });

        if (request) requestsRef.current.add(request);
      };

      next(0);
    },
    [getRouter]
  );

  const synchronize = useCallback(
    (generation) => {
      const wanted = new Map(days.map((day) => [day.key, day]));

      layersRef.current.forEach((entry, key) => {
        if (!wanted.has(key)) {
          if (map.hasLayer(entry.group)) map.removeLayer(entry.group);
          layersRef.current.delete(key);
          reportRef.current?.(key, null);
        }
      });

      const queue = [];

      days.forEach((day) => {
        const signature = signatureFor(day);
        const current = layersRef.current.get(day.key);
        if (current?.signature === signature) return;

        const cached = cacheRef.current.get(signature);
        if (cached) {
          if (cached.failed) rejectDay(day, signature, cached.error);
          else drawDay(day, signature, cached);
          return;
        }
        queue.push({ day, signature });
      });

      let active = 0;

      const startNext = () => {
        if (generationRef.current !== generation) return;
        while (active < MAX_CONCURRENT_ROUTES && queue.length > 0) {
          const { day, signature } = queue.shift();
          active += 1;

          const request = getRouter().route(day.points.map(toWaypoint), (err, routes) => {
            requestsRef.current.delete(request);

            if (generationRef.current !== generation) return;

            const storeResult = (result) => {
              if (cacheRef.current.size >= ROUTE_CACHE_LIMIT) {
                cacheRef.current.delete(cacheRef.current.keys().next().value);
              }
              cacheRef.current.set(signature, result);
            };

            const complete = (result) => {
              storeResult(result);
              drawDay(day, signature, result);
              active -= 1;
              startNext();
            };

            const misplaced = routes?.length
              ? findMisplacedPoint(routes[0], day.points)
              : null;

            if (!err && routes?.length && !misplaced) {
              complete(buildResult(routes[0], day.points));
              return;
            }

            if (isUnroutable(err) || misplaced) {
              console.warn(`[trasy] Brak połączenia drogowego, liczę odcinki osobno: ${day.label}`);
              routeLegsSeparately(day, generation, complete);
              return;
            }

            console.warn(`[trasy] Nie udało się wyznaczyć trasy: ${day.label}`, err);
            const error = { message: ROUTE_ERROR_FAILED, pointId: null };
            storeResult({ failed: true, error });
            rejectDay(day, signature, error);
            active -= 1;
            startNext();
          });

          if (request) requestsRef.current.add(request);
        }
      };

      startNext();
    },
    [days, map, drawDay, rejectDay, routeLegsSeparately, getRouter]
  );

  useEffect(() => {
    const button = L.easyButton({
      states: [
        {
          stateName: 'hidden',
          icon: '<i class="fas fa-route" style="line-height:30px;font-size:14px;"></i>',
          title: 'Pokaż trasy dni',
          onClick: (btn) => {
            btn.state('shown');
            setEnabled(true);
          },
        },
        {
          stateName: 'shown',
          icon: '<i class="fas fa-route" style="line-height:30px;font-size:14px;opacity:0.45;"></i>',
          title: 'Ukryj trasy dni',
          onClick: (btn) => {
            btn.state('hidden');
            setEnabled(false);
          },
        },
      ],
    }).addTo(map);

    return () => map.removeControl(button);
  }, [map]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;

    abortPending();

    if (!enabled) {
      removeAllLayers();
      return undefined;
    }

    const needsFetch = days.some((day) => {
      const signature = signatureFor(day);
      if (layersRef.current.get(day.key)?.signature === signature) return false;
      return !cacheRef.current.has(signature);
    });

    timerRef.current = setTimeout(
      () => synchronize(generation),
      needsFetch ? ROUTE_DEBOUNCE_MS : 0
    );

    return () => clearTimeout(timerRef.current);
  }, [enabled, days, synchronize, abortPending, removeAllLayers]);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      generationRef.current += 1;
      abortPending();
      removeAllLayers();
    },
    [abortPending, removeAllLayers]
  );

  return null;
};

export default DayRoutes;
