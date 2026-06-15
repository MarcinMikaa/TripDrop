import { useState, useEffect } from 'react';
import { tripService } from '../../services/tripService';
import styles from './TripsPage.module.scss';

export default function TripsPage() {
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    tripService.getAll()
      .then(data => { setTrips(data); setError(null); })
      .catch(err  => setError(err.message))
      .finally(()  => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Wycieczki</h1>
      </div>

      {loading && (
        <p className={styles.loading}>Ładowanie danych z API...</p>
      )}

      {error && !loading && (
        <div className={styles.error}>
          <strong>Błąd połączenia z backendem.</strong> Upewnij się że działa na{' '}
          <code>localhost:5206</code>
          <br />
          <small>{error}</small>
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <p className={styles.empty}>Brak wycieczek.</p>
      )}

      {!loading && !error && trips.length > 0 && (
        <>
          <div className={styles.grid}>
            {trips.map((trip, i) => (
              <TripCard key={trip.id ?? i} trip={trip} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TripCard({ trip }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.cardName}>{trip.name}</h3>
      <div className={styles.cardMeta}>
        <div className={styles.metaRow}>
          <span>ID</span>
          <code>{trip.id}</code>
        </div>
        <div className={styles.metaRow}>
          <span>Właściciel</span>
          <code>{trip.ownerId}</code>
        </div>
        <div className={styles.metaRow}>
          <span>Lat / Lng</span>
          <code>{trip.startLatitude?.toFixed(3)} / {trip.startLongitude?.toFixed(3)}</code>
        </div>
        {trip.createdAt && (
          <div className={styles.metaRow}>
            <span>Utworzono</span>
            <code>{new Date(trip.createdAt).toLocaleDateString('pl-PL')}</code>
          </div>
        )}
      </div>
    </article>
  );
}
