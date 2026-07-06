import { useState, useEffect} from 'react';
//import { useParams } from 'react-router-dom';
//import { tripService } from '../services/TripService';
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

const DAY_NAMES = [
  'Piaskownica',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

const TRIP_DAYS = 6; //dopiąć serwis liczenia

const MOCK_PINS = {
  0: [
    { id: 'p7', title: 'TEST' },
  ],
  1: [
    { id: 'p1', title: 'Wieża Eiffla' },
    { id: 'p2', title: 'Mount Everest' },
  ],
  2: [
    { id: 'p3', title: 'Notre dam' },
  ],
  3: [],
  4: [
    { id: 'p4', title: 'Wieża Eiffla 2' },
  ],
  5: [
    { id: 'p5', title: 'Wersal' },
  ],
};

const DEFAULT_CENTER = [51.4297, 20.1122];
const DEFAULT_ZOOM = 13;

/*
const { id } = useParams();

const [trip, setTrip] = useState(null);

useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
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
*/

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
  const [mapPins, setMapPins] = useState([]);

  const days = DAY_NAMES.slice(0, TRIP_DAYS).map((name, index) => ({
    name,
    index,
    pins: MOCK_PINS[index] || [],
  }));

  const handleAddPin = (pin) => {
    setMapPins((prev) => [...prev, pin]);
  };

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
          {days.map((day) => (
            <div key={day.index} className={styles.dayColumn}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{day.name}</span>
                <span className={styles.dayCount}>{day.pins.length}</span>
              </div>

              <div className={styles.pinList}>
                {day.pins.map((pin) => (
                  <div key={pin.id} className={styles.pinCard}>
                    {pin.title}
                  </div>
                ))}

                {day.pins.length === 0 && (
                  <div className={styles.emptyState}>Brak pinezek</div>
                )}
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
