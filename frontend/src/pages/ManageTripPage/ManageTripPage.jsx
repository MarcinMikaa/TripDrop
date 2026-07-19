import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { tripService } from '../../services/tripService';
import { friendshipService } from '../../services/FriendshipService';
import { swalError, swalConfirmDelete, toastSuccess } from '../../utils/swal';
import styles from './ManageTripPage.module.scss';

const NAV_ITEMS = [
  { key: 'info', icon: 'circle-info', label: 'Podstawowe informacje' },
  { key: 'participants', icon: 'users', label: 'Uczestnicy' },
  { key: 'points', icon: 'route', label: 'Punkty trasy' },
  { key: 'settings', icon: 'gear', label: 'Ustawienia' },
];

const ManageTripPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('info');
  const [trip, setTrip] = useState(null);
  const [friends, setFriends] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [isSaving, setIsSaving] = useState(false);

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

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await tripService.update(id, {
        name: form.name.trim(), description: form.description.trim() || null,
        startDate: form.startDate || null, endDate: form.endDate || null,
      });

      setTrip(prev => ({ ...prev, name: form.name.trim(), description: form.description.trim() || null }));
      await toastSuccess('Zapisano zmiany!');
    } catch (err) {
      await swalError('Błąd', err.message);
    } finally {
      setIsSaving(false);
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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

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
            {' · '}{trip.participantCount + 1} uczestników
          </div>
        </div>
      </div>

      <div className={styles.shell}>
        <div className={styles.nav}>
          {NAV_ITEMS.map((item) => (
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
                  <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label>Data zakończenia</label>
                  <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
                </div>
              </div>
              <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </>
          )}

          {activeTab === 'participants' && (
            <>
              <p className={styles.contentTitle}>Uczestnicy ({trip.participantCount + 1})</p>

              <div className={styles.partRow}>
                <div className={styles.partAvatar}>T</div>
                <span className={styles.partName}>Ty</span>
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
        </div>
      </div>
    </div>
  );
};

export default ManageTripPage;
