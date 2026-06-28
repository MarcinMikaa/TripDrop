import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../../services/tripService';
import styles from './TripsPage.module.scss';

const TripsPage = () => {
  const navigate = useNavigate();

  const [trips, setTrips]       = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await tripService.getAll();
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDelete = async (tripId) => {
    if (!window.confirm('Na pewno chcesz usunąć tę wycieczkę?')) return;
    setDeletingId(tripId);
    try {
      await tripService.delete(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      showToast('Wycieczka została usunięta.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.wrapper}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.top}>
        <h1>Twoje wycieczki</h1>
        <button className={styles.newBtn} onClick={() => navigate('/trips/new')}>
          <i className="ti ti-plus" aria-hidden="true" />
          Nowa wycieczka
        </button>
      </div>

      {isLoading && <p className={styles.empty}>Ładowanie...</p>}

      {!isLoading && error && (
        <p className={styles.errorMsg}>{error}</p>
      )}

      {!isLoading && !error && trips.length === 0 && (
        <div className={styles.emptyState}>
          <i className="ti ti-map-off" aria-hidden="true" />
          <p>Nie masz jeszcze żadnych wycieczek.</p>
          <button className={styles.newBtn} onClick={() => navigate('/trips/new')}>
            Zaplanuj pierwszą
          </button>
        </div>
      )}

      {!isLoading && !error && trips.length > 0 && (
        <div className={styles.list}>
          {trips.map((trip) => (
            <article key={trip.id} className={styles.card}>
              <div className={styles.cardAccent} />

              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <h2 className={styles.cardName}>{trip.name}</h2>
                  {trip.isOwner && (
                    <span className={styles.ownerBadge}>Organizator</span>
                  )}
                </div>

                {trip.description && (
                  <p className={styles.cardDesc}>{trip.description}</p>
                )}

                <div className={styles.cardMeta}>
                  {(trip.startDate || trip.endDate) && (
                    <span className={styles.metaItem}>
                      <i className="ti ti-calendar" aria-hidden="true" />
                      {formatDate(trip.startDate)}
                      {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                    </span>
                  )}
                  <span className={styles.metaItem}>
                    <i className="ti ti-users" aria-hidden="true" />
                    {trip.participantCount === 0
                      ? 'Tylko ty'
                      : `${trip.participantCount + 1} uczestników`}
                  </span>
                </div>

                {trip.participants?.length > 0 && (
                  <div className={styles.avatars}>
                    {trip.participants.slice(0, 4).map((p) => (
                      <div key={p.id} className={styles.avatar} title={p.username}>
                        {p.username[0].toUpperCase()}
                      </div>
                    ))}
                    {trip.participants.length > 4 && (
                      <div className={`${styles.avatar} ${styles.avatarMore}`}>
                        +{trip.participants.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  className={`${styles.actionBtn} ${styles.primary}`}
                  onClick={() => navigate(`/planner/${trip.id}`)}
                >
                  <i className="ti ti-map-2" aria-hidden="true" />
                  Otwórz planer
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => navigate(`/planner/${trip.id}/add-participant`)}
                >
                  <i className="ti ti-user-plus" aria-hidden="true" />
                  Dodaj uczestnika
                </button>
                {trip.isOwner && (
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => handleDelete(trip.id)}
                    disabled={deletingId === trip.id}
                  >
                    <i className="ti ti-trash" aria-hidden="true" />
                    {deletingId === trip.id ? 'Usuwanie...' : 'Usuń'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripsPage;