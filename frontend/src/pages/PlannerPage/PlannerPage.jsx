import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import styles from './PlannerPage.module.scss';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [51.4297, 20.1122];
const DEFAULT_ZOOM = 13;

const buildBuckets = (startDate, endDate) => {
  const buckets = [{ index: null, label: 'Nieprzypisane' }];

  if (!startDate || !endDate) return buckets;

  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let index = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    let label = formatter.format(cursor);
    label = label.charAt(0).toUpperCase() + label.slice(1);
    buckets.push({ index, label });
    index++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
};

const ResizeAware = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const MapClickHandler = ({ onAddPin }) => {
  useMapEvents({
    click(e) {
      onAddPin({
        id: `pin-${Date.now()}`,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return null;
};

const PlannerPage = () => {
  const { id } = useParams();

  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapPins, setMapPins] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tripData = await tripService.getById(id);
        setTrip(tripData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddPin = (pin) => {
    setMapPins((prev) => [...prev, pin]);
  };

  if (isLoading) {
    return <div className={styles.status}>Ładowanie wycieczki</div>;
  }

  if (error) {
    return <div className={styles.status}>Błąd: {error}</div>;
  }

  if (!trip) {
    return <div className={styles.status}>Nie znaleziono wycieczki.</div>;
  }

  const buckets = buildBuckets(trip.startDate, trip.endDate);

  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId="planner-layout"
      className={styles.page}
    >
      {/* Mapa */}
      <Panel defaultSize={60} minSize={30}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className={styles.map}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapPins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} />
          ))}
          <MapClickHandler onAddPin={handleAddPin} />
          <ResizeAware />
        </MapContainer>
      </Panel>

      {/* Bar */}
      <PanelResizeHandle className={styles.resizeHandle}>
        <div className={styles.resizeGrip} />
      </PanelResizeHandle>

      {/* Boxy */}
      <Panel defaultSize={40} minSize={20} className={styles.daysPanel}>
        <div className={styles.daysList}>
          {buckets.map((bucket) => (
            <div
              key={bucket.index ?? 'unassigned'}
              className={styles.dayColumn}
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{bucket.label}</span>
                <span className={styles.dayCount}>0</span>
              </div>

              <div className={styles.pinList}>
                <div className={styles.emptyState}>Brak pinezek</div>
              </div>

              <button type="button" className={styles.addPinBtn}>
                Dodaj pinezkę
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </PanelGroup>
  );
};

export default PlannerPage;
