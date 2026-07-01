import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../../services/tripService';
import { swalConfirmDelete, toastSuccess, swalError } from '../../utils/swal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './TripsPage.module.scss';

const TripsPage = () => {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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
    const result = await swalConfirmDelete('Usunąć wycieczkę?', 'Tej operacji nie można cofnąć.');
    if (!result.isConfirmed) return;

    setDeletingId(tripId);
    try {
      await tripService.delete(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      await toastSuccess('Wycieczka została usunięta.');
    } catch (err) {
      await swalError('Błąd', err.message);
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
      <div className={styles.top}>
        <h1>Twoje wycieczki</h1>
        <button className={styles.newBtn} onClick={() => navigate('/trips/new')}>
          <FontAwesomeIcon icon="plus" />
          Nowa wycieczka
        </button>
      </div>

      {isLoading && <p className={styles.empty}>Ładowanie...</p>}

      {!isLoading && error && <p className={styles.errorMsg}>{error}</p>}

      {!isLoading && !error && trips.length === 0 && (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon="map" />
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
                  {trip.isOwner && <span className={styles.ownerBadge}>Organizator</span>}
                </div>

                {trip.description && <p className={styles.cardDesc}>{trip.description}</p>}

                <div className={styles.cardMeta}>
                  {(trip.startDate || trip.endDate) && (
                    <span className={styles.metaItem}>
                      <FontAwesomeIcon icon="calendar" />
                      {formatDate(trip.startDate)}
                      {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                    </span>
                  )}
                  <span className={styles.metaItem}>
                    <FontAwesomeIcon icon="users" />
                    {trip.participantCount === 0 ? 'Tylko ty' : `${trip.participantCount + 1} uczestników`}
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
                      <div className={`${styles.avatar} ${styles.avatarMore}`}>+{trip.participants.length - 4}</div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button
                  className={`${styles.actionBtn} ${styles.primary}`}
                  onClick={() => navigate(`/planner/${trip.id}`)}>
                  <FontAwesomeIcon icon="map-location-dot" />
                  Otwórz planer
                </button>
                <button className={styles.actionBtn} onClick={() => navigate(`/planner/${trip.id}/add-participant`)}>
                  <FontAwesomeIcon icon="user-plus" />
                  Dodaj uczestnika
                </button>
                {trip.isOwner && (
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => handleDelete(trip.id)}
                    disabled={deletingId === trip.id}>
                    <FontAwesomeIcon icon="trash" />
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
