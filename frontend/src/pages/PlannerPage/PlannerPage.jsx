import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { tripPointService } from '../../services/TripPointService';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
const UNASSIGNED_KEY = 'unassigned';

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

const MapClickHandler = ({ onEmptyClick }) => {
  useMapEvents({
    click(e) {
      if (e.originalEvent?.target?.closest?.('.leaflet-marker-icon')) return;
      onEmptyClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
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
          autoFocus
          className={styles.popupNameInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
        />
      ) : (
        <div className={styles.popupName}>
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
        <button type="button" onClick={() => setEditing(true)} disabled={editing}>
          Edytuj pinezkę
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
      <div className={styles.popupActions}>
        <button
          type="button"
          onClick={() => onAddPin(position.lat, position.lng)}
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

  //Pusty klik
  const handleEmptyMapClick = ({ lat, lng }) => {
    setContextMenuPos({ lat, lng });
  };

  const handleCreatePin = async (lat, lng) => {
    setContextMenuPos(null);
    try {
      const created = await tripPointService.create(tripId, {
        name: '',
        latitude: lat,
        longitude: lng,
        dayIndex: null,
      });
      setPins((prev) => [...prev, created]);
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
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.latitude, pin.longitude]}>
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

          <MapClickHandler onEmptyClick={handleEmptyMapClick} />
          <ResizeAware />
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
  );
};

export default PlannerPage;
