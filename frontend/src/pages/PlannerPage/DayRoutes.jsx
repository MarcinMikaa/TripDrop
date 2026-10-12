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
const ROUTE_DEBOUNCE_MS = 600;
const MAX_CONCURRENT_ROUTES = 2;
const ROUTE_CACHE_LIMIT = 60;
const COORD_PRECISION = 5;

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

const metaRow = (term, value) => {
  if (!value) return '';
  return `<dt>${term}</dt><dd>${value}</dd>`;
};

const segmentMarkup = (day, leg) =>
  `<dl class="${styles.popupMeta}">` +
  metaRow('Odcinek', `${leg.fromName} - ${leg.toName}`) +
  metaRow('Dystans', formatDistance(leg.distance)) +
  metaRow('Czas', formatDuration(leg.time)) +
  '</dl>';

const routeMarkup = (day, result) =>
  `<dl class="${styles.popupMeta}">` +
  metaRow('Trasa', `${day.points[0]?.name ?? ''} - ${day.points[day.points.length - 1]?.name ?? ''}`) +
  metaRow('Przystanki', String(day.points.length)) +
  metaRow('Dystans', formatDistance(result.distance)) +
  metaRow('Czas', formatDuration(result.time)) +
  '</dl>';

const buildPopupContent = (day, leg, result) => {
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

  const details = L.DomUtil.create('div', '', container);

  L.DomEvent.on(segmentBtn, 'click', (event) => {
    L.DomEvent.stop(event);
    details.innerHTML = segmentMarkup(day, leg);
  });

  L.DomEvent.on(routeBtn, 'click', (event) => {
    L.DomEvent.stop(event);
    details.innerHTML = routeMarkup(day, result);
  });

  return container;
};

const DayRoutes = ({ days, onRoutesComputed }) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(false);

  const layersRef = useRef(new Map());
  const cacheRef = useRef(new Map());
  const requestsRef = useRef(new Set());
  const routerRef = useRef(null);
  const timerRef = useRef(null);
  const generationRef = useRef(0);
  const reportRef = useRef(onRoutesComputed);

  useEffect(() => {
    reportRef.current = onRoutesComputed;
  }, [onRoutesComputed]);

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

      result.legs.forEach((leg) => {
        const line = L.polyline(leg.coordinates, {
          color: day.color,
          weight: ROUTE_WEIGHT,
          opacity: ROUTE_OPACITY,
        });

        line.bindTooltip(
          `${leg.fromName} - ${leg.toName} - ${formatDistance(leg.distance)}, ${formatDuration(leg.time)}`,
          { sticky: true }
        );

        line.bindPopup(() => buildPopupContent(day, leg, result));

        line.on('mouseover', () => line.setStyle({ weight: ROUTE_HOVER_WEIGHT }));
        line.on('mouseout', () => line.setStyle({ weight: ROUTE_WEIGHT }));

        group.addLayer(line);
      });

      group.addTo(map);
      layersRef.current.set(day.key, { group, signature });

      reportRef.current?.(day.key, {
        legs: result.legs.map((leg) => ({
          index: leg.index,
          fromName: leg.fromName,
          toName: leg.toName,
          distance: leg.distance,
          time: leg.time,
        })),
        distance: result.distance,
        time: result.time,
      });
    },
    [map]
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
          drawDay(day, signature, cached);
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

          const waypoints = day.points.map((point) =>
            L.Routing.waypoint(L.latLng(point.lat, point.lng))
          );

          const request = getRouter().route(waypoints, (err, routes) => {
            requestsRef.current.delete(request);
            active -= 1;

            if (generationRef.current !== generation) return;

            if (err || !routes?.length) {
              console.warn(`[trasy] Nie udało się wyznaczyć trasy: ${day.label}`, err);
            } else {
              const route = routes[0];
              const legs = buildLegs(route, day.points);
              const result = {
                legs: legs.length
                  ? legs
                  : [
                      {
                        index: 0,
                        fromName: day.points[0]?.name ?? '',
                        toName: day.points[day.points.length - 1]?.name ?? '',
                        coordinates: route.coordinates,
                        distance: route.summary.totalDistance,
                        time: route.summary.totalTime,
                      },
                    ],
                distance: route.summary.totalDistance,
                time: route.summary.totalTime,
              };

              if (cacheRef.current.size >= ROUTE_CACHE_LIMIT) {
                cacheRef.current.delete(cacheRef.current.keys().next().value);
              }
              cacheRef.current.set(signature, result);
              drawDay(day, signature, result);
            }

            startNext();
          });

          if (request) requestsRef.current.add(request);
        }
      };

      startNext();
    },
    [days, map, drawDay, getRouter]
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

    timerRef.current = setTimeout(() => synchronize(generation), ROUTE_DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [enabled, synchronize, abortPending, removeAllLayers]);

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
