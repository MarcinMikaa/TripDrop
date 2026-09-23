import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

const OSRM_SERVICE_URL = 'https://router.project-osrm.org/route/v1';
const ROUTE_PROFILE = 'driving';
const ROUTE_WEIGHT = 5;
const ROUTE_OPACITY = 0.75;

const formatDistance = (meters) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
};

const DayRoutes = ({ days }) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(false);

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
    if (!enabled) return undefined;

    let cancelled = false;
    const layers = [];

    let router;
    try {
      router = L.Routing.osrmv1({
        serviceUrl: OSRM_SERVICE_URL,
        profile: ROUTE_PROFILE,
      });
    } catch (err) {
      console.error('[trasy] Router niedostępny:', err);
      return undefined;
    }

    days.forEach((day) => {
      const waypoints = day.points.map((point) =>
        L.Routing.waypoint(L.latLng(point.lat, point.lng))
      );

      router.route(waypoints, (err, routes) => {
        if (cancelled) return;
        if (err || !routes?.length) {
          console.warn(`[trasy] Nie udało się wyznaczyć trasy dla: ${day.label}`, err);
          return;
        }

        const route = routes[0];
        const line = L.polyline(route.coordinates, {
          color: day.color,
          weight: ROUTE_WEIGHT,
          opacity: ROUTE_OPACITY,
        });

        line.bindTooltip(
          `${day.label} - ${formatDistance(route.summary.totalDistance)}, ${formatDuration(route.summary.totalTime)}`,
          { sticky: true }
        );

        line.addTo(map);
        layers.push(line);
      });
    });

    return () => {
      cancelled = true;
      layers.forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
    };
  }, [enabled, days, map]);

  return null;
};

export default DayRoutes;
