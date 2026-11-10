import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { tripService } from '../../services/TripService';
import { friendshipService } from '../../services/FriendshipService';
import { swalError, swalConfirmDelete, toastSuccess } from '../../utils/swal';
import PublicationTab from './PublicationTab';
import styles from './ManageTripPage.module.scss';

const NAV_ITEMS = [
  { key: 'info', icon: 'circle-info', label: 'Podstawowe informacje' },
  { key: 'participants', icon: 'users', label: 'Uczestnicy' },
  { key: 'points', icon: 'route', label: 'Punkty trasy' },
  { key: 'share', icon: 'share-nodes', label: 'Udostępnianie', ownerOnly: true },
  { key: 'settings', icon: 'gear', label: 'Ustawienia' },
];

const lockedAtFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatLockedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : lockedAtFormat.format(date);
};

const ManageTripPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('info');
  const [trip, setTrip] = useState(null);
  const [friends, setFriends] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLockBusy, setIsLockBusy] = useState(false);

  useEffect(() => {
    tripService
      .getById(id)
      .then((t) => {
        setTrip(t);
        setForm({
          name: t.name,
          description: t.description || '',
          startDate: t.startDate?.slice(0, 10) || '',
          endDate: t.endDate?.slice(0, 10) || '',
        });
      })
      .catch((err) => swalError('Błąd', err.message));
    friendshipService
      .getFriends()
      .then(setFriends)
      .catch(() => {});
  }, [id]);

  const isPlanLocked = Boolean(trip?.planLockedAt);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await tripService.update(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      });

      setTrip((prev) => ({
        ...prev,
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }));
      await toastSuccess('Zapisano zmiany!');
    } catch (err) {
      await swalError('Błąd', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlanLock = async () => {
    setIsLockBusy(true);
    try {
      const lock = isPlanLocked ? await tripService.unlockPlan(id) : await tripService.lockPlan(id);
      setTrip((prev) => ({ ...prev, planLockedAt: lock.planLockedAt }));
      toastSuccess(lock.isPlanLocked ? 'Plan zamknięty.' : 'Planowanie wznowione.');
    } catch (err) {
      swalError('Błąd', err.message);
    } finally {
      setIsLockBusy(false);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    const result = await swalConfirmDelete('Usunąć uczestnika?', 'Straci dostęp do tej wycieczki.');
    if (!result.isConfirmed) return;
    try {
      await tripService.removeParticipant(id, userId);
      setTrip((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== userId),
        participantCount: prev.participantCount - 1,
      }));
      toastSuccess('Uczestnik usunięty.');
    } catch (err) {
      swalError('Błąd', err.message);
    }
  };

  const handleAddParticipant = async (userId, username) => {
    try {
      await tripService.addParticipant(id, userId);
      setTrip((prev) => ({
        ...prev,
        participants: [...prev.participants, { id: userId, username }],
        participantCount: prev.participantCount + 1,
      }));
      toastSuccess('Uczestnik dodany!');
    } catch (err) {
      swalError('Błąd', err.message);
    }
  };

  if (!trip) return null;

  const availableFriends = friends.filter((f) => !trip.participants.some((p) => p.id === f.id));
  const ownerName = trip.isOwner ? 'Ty' : trip.ownerUsername;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.back} onClick={() => navigate('/trips')}>
        <FontAwesomeIcon icon="arrow-left" /> Powrót do wycieczek
      </span>

      <div className={styles.topbar}>
        <div className={styles.topbarPin}>
          <FontAwesomeIcon icon="map-pin" />
        </div>
        <div>
          <div className={styles.topbarName}>{trip.name}</div>
          <div className={styles.topbarMeta}>
            {trip.startDate && `${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}`}
            {' - '}
            {trip.participantCount + 1} uczestników
          </div>
        </div>
      </div>

      <div className={styles.shell}>
        <div className={styles.nav}>
          {NAV_ITEMS.filter((item) => !item.ownerOnly || trip.isOwner).map((item) => (
            <div
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ''} ${item.disabled ? styles.disabled : ''}`}
              onClick={() => setActiveTab(item.key)}>
              <FontAwesomeIcon icon={item.icon} />
              {item.label}
            </div>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === 'info' && (
            <>
              <p className={styles.contentTitle}>Podstawowe informacje</p>
              <div className={styles.field}>
                <label>Nazwa wycieczki</label>
                <input name="name" value={form.name} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label>Opis</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
              </div>
              <div className={styles.dates}>
                <div className={styles.field}>
                  <label>Data rozpoczęcia</label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    disabled={isPlanLocked}
                  />
                </div>
                <div className={styles.field}>
                  <label>Data zakończenia</label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    disabled={isPlanLocked}
                  />
                </div>
              </div>
              {isPlanLocked && (
                <p className={styles.fieldHint}>
                  <FontAwesomeIcon icon="lock" />
                  Daty są zablokowane, bo plan jest zamknięty. Wznowisz go w zakładce Ustawienia.
                </p>
              )}
              <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </>
          )}

          {activeTab === 'participants' && (
            <>
              <p className={styles.contentTitle}>Uczestnicy ({trip.participantCount + 1})</p>

              <div className={styles.partRow}>
                <div className={styles.partAvatar}>{(trip.ownerUsername || '?')[0].toUpperCase()}</div>
                <span className={styles.partName}>{ownerName}</span>
                <span className={styles.ownerTag}>Organizator</span>
              </div>

              {trip.participants.map((p) => (
                <div key={p.id} className={styles.partRow}>
                  <div className={styles.partAvatar}>{p.username[0].toUpperCase()}</div>
                  <span className={styles.partName}>{p.username}</span>
                  {trip.isOwner && (
                    <button className={styles.removeBtn} onClick={() => handleRemoveParticipant(p.id)}>
                      Usuń
                    </button>
                  )}
                </div>
              ))}

              {trip.isOwner && availableFriends.length > 0 && (
                <div className={styles.addSection}>
                  <p className={styles.addTitle}>Dodaj znajomego</p>
                  {availableFriends.map((f) => (
                    <div key={f.id} className={styles.partRow}>
                      <div className={styles.partAvatar}>{f.username[0].toUpperCase()}</div>
                      <span className={styles.partName}>{f.username}</span>
                      <button className={styles.addBtn} onClick={() => handleAddParticipant(f.id, f.username)}>
                        Dodaj
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'share' && trip.isOwner && (
            <PublicationTab trip={trip} onGoToInfo={() => setActiveTab('info')} />
          )}

          {activeTab === 'settings' && (
            <>
              <p className={styles.contentTitle}>Ustawienia</p>
              <section className={`${styles.lockCard} ${isPlanLocked ? styles.lockCardLocked : ''}`}>
                <div className={styles.lockInfo}>
                  <span className={styles.lockTitle}>
                    <FontAwesomeIcon icon={isPlanLocked ? 'lock' : 'lock-open'} />
                    {isPlanLocked ? 'Plan zamknięty' : 'Planowanie trwa'}
                  </span>
                  <p className={styles.lockText}>
                    {isPlanLocked
                      ? `Zamknięty ${formatLockedAt(trip.planLockedAt)}. Punkty i daty są tylko do odczytu dla wszystkich uczestników.`
                      : 'Gdy plan jest gotowy, zamknij go. Nikt nie zmieni już punktów ani dat, a eksport dalej działa. Wznowić możesz w każdej chwili.'}
                  </p>
                </div>
                {trip.isOwner && (
                  <button
                    className={isPlanLocked ? styles.unlockBtn : styles.lockBtn}
                    onClick={handleTogglePlanLock}
                    disabled={isLockBusy}>
                    <FontAwesomeIcon icon={isPlanLocked ? 'lock-open' : 'lock'} />
                    {isLockBusy ? 'Zapisywanie...' : isPlanLocked ? 'Wznów planowanie' : 'Zakończ planowanie'}
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageTripPage;
