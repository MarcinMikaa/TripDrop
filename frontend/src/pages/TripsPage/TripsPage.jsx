import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../../services/tripService';
import { swalConfirmDelete, toastSuccess, swalError } from '../../utils/swal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './TripsPage.module.scss';

const isUpcoming = (trip) => {
  if (!trip.endDate) return true;
  return new Date(trip.endDate) >= new Date(new Date().setHours(0, 0, 0, 0));
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(new Date().setHours(0, 0, 0, 0));
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

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

  const handleLeave = async (tripId) => {
    const result = await swalConfirmDelete('Opuścić wycieczkę?', 'Stracisz dostęp do tej wycieczki.');
    if (!result.isConfirmed) return;
    try {
      await tripService.leave(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      toastSuccess('Opuściłeś wycieczkę.');
    } catch (err) {
      swalError('Błąd', err.message);
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

  const upcomingCount = trips.filter(isUpcoming).length;
  const totalParticipants = trips.reduce((sum, t) => sum + t.participantCount + 1, 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.top}>
        <div>
          <h1>Twoje wycieczki</h1>
          <p className={styles.subtitle}>Wszystkie podróże które planujesz lub w których uczestniczysz</p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/trips/new')}>
          <FontAwesomeIcon icon="plus" />
          Nowa wycieczka
        </button>
      </div>

      {!isLoading && !error && trips.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconSteel}`}>
              <FontAwesomeIcon icon="map-location-dot" />
            </div>
            <div>
              <div className={styles.statNum}>{trips.length}</div>
              <div className={styles.statLabel}>wszystkich wycieczek</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconAmber}`}>
              <FontAwesomeIcon icon="calendar" />
            </div>
            <div>
              <div className={styles.statNum}>{upcomingCount}</div>
              <div className={styles.statLabel}>nadchodzące</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <FontAwesomeIcon icon="users" />
            </div>
            <div>
              <div className={styles.statNum}>{totalParticipants}</div>
              <div className={styles.statLabel}>łącznie uczestników</div>
            </div>
          </div>
        </div>
      )}

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

      {!isLoading && !error && trips.length > 0 && <div className={styles.divider} />}

      {!isLoading && !error && trips.length > 0 && (
        <div className={styles.list}>
          {trips.map((trip) => {
            const upcoming = isUpcoming(trip);
            const days = daysUntil(trip.startDate);

            return (
              <article key={trip.id} className={`${styles.card} ${upcoming ? styles.cardUpcoming : styles.cardPast}`}>
                <div className={styles.cardAccent} />

                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <h2 className={styles.cardName}>{trip.name}</h2>
                    {trip.isOwner && <span className={styles.ownerBadge}>Organizator</span>}
                    {upcoming && days !== null && days >= 0 && (
                      <span className={styles.statusBadgeUpcoming}>
                        {days === 0 ? 'Dzisiaj' : `Za ${days} ${days === 1 ? 'dzień' : 'dni'}`}
                      </span>
                    )}
                    {!upcoming && <span className={styles.statusBadgePast}>Zakończona</span>}
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
                  {trip.isOwner && (
                    <button className={styles.actionBtn} onClick={() => navigate(`/trips/${trip.id}/manage`)}>
                      <FontAwesomeIcon icon="gear" />
                      Zarządzaj
                    </button>
                  )}
                  {trip.isOwner && (
                    <button
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleDelete(trip.id)}
                      disabled={deletingId === trip.id}>
                      <FontAwesomeIcon icon="trash" />
                      {deletingId === trip.id ? 'Usuwanie...' : 'Usuń'}
                    </button>
                  )}
                  {!trip.isOwner && (
                    <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleLeave(trip.id)}>
                      <FontAwesomeIcon icon="right-from-bracket" /> Opuść
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TripsPage;
