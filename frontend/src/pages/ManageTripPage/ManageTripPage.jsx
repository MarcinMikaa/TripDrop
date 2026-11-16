import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { tripService } from '../../services/TripService';
import { tripPointService } from '../../services/TripPointService';
import { friendshipService } from '../../services/FriendshipService';
import { swalConfirmDelete, toastError, toastSuccess } from '../../utils/swal';
import { colorForUser } from '../../utils/useColor';
import { pluralize, PLACE_FORMS } from '../../utils/pluralize';
import TripPanel from '../../components/TripPanel/TripPanel';
import TripDetailsFields from '../../components/TripPanel/TripDetailsFields';
import TripPreviewCard from '../../components/TripPanel/TripPreviewCard';
import ParticipantPicker from '../../components/TripPanel/ParticipantPicker';
import {
  formatRange,
  formToPayload,
  isSameForm,
  listDays,
  tripToForm,
  validateTripForm,
} from '../../components/TripPanel/tripForm';
import panel from '../../components/TripPanel/TripPanel.module.scss';
import PublicationTab from './PublicationTab';
import styles from './ManageTripPage.module.scss';

const DEFAULT_TAB = 'info';

const TABS = [
  { key: 'info', label: 'Podstawy' },
  { key: 'participants', label: 'Uczestnicy' },
  { key: 'points', label: 'Punkty trasy' },
  { key: 'share', label: 'Udostępnianie', ownerOnly: true },
  { key: 'settings', label: 'Ustawienia' },
];

const PEOPLE_FORMS = { one: 'uczestnik', few: 'uczestników', many: 'uczestników', other: 'uczestnika' };

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

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={panel.icon}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const Avatar = ({ id, username }) => (
  <span className={styles.avatar} style={{ background: colorForUser(id) }} aria-hidden="true">
    {(username || '?').charAt(0).toUpperCase()}
  </span>
);

const PointsOverview = ({ trip }) => {
  const [state, setState] = useState({ tripId: null, points: [], error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    tripPointService
      .getByTripId(trip.id)
      .then((points) => {
        if (!cancelled) setState({ tripId: trip.id, points, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ tripId: trip.id, points: [], error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [trip.id, reloadToken]);

  const days = useMemo(() => listDays(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);

  const grouped = useMemo(() => {
    const byDay = days.map(() => []);
    const unassigned = [];
    state.points.forEach((point) => {
      if (Number.isInteger(point.dayIndex) && point.dayIndex >= 0 && point.dayIndex < byDay.length) {
        byDay[point.dayIndex].push(point);
      } else {
        unassigned.push(point);
      }
    });
    byDay.forEach((group) => group.sort((a, b) => a.position - b.position));
    return { byDay, unassigned };
  }, [days, state.points]);

  const isLoading = state.tripId !== trip.id;

  return (
    <>
      <div className={styles.sectionHead}>
        <p className={panel.intro}>Podgląd dni. Kolejność i nowe punkty ustawiasz w planerze, razem z resztą ekipy.</p>
        <Link to={`/planner/${trip.id}`} className={panel.ghostBtn}>
          Edytuj w planerze
        </Link>
      </div>

      {isLoading && <p className={panel.hint}>Wczytywanie punktów...</p>}

      {!isLoading && state.error && (
        <div className={styles.inlineError} role="alert">
          <span>Nie udało się wczytać punktów: {state.error}</span>
          <button type="button" className={panel.ghostBtn} onClick={() => setReloadToken((v) => v + 1)}>
            Spróbuj ponownie
          </button>
        </div>
      )}

      {!isLoading && !state.error && state.points.length === 0 && (
        <p className={styles.empty}>Ta wyprawa nie ma jeszcze punktów. Dodaj pierwszy w planerze.</p>
      )}

      {!isLoading && !state.error && state.points.length > 0 && (
        <ol className={styles.dayList}>
          {days.map((day) => {
            const points = grouped.byDay[day.index];
            return (
              <li key={day.index} className={styles.dayRow}>
                <span className={styles.dayBadge}>{day.index + 1}</span>
                <div className={styles.dayText}>
                  <span className={styles.dayLabel}>{day.label}</span>
                  <span className={styles.dayNames}>
                    {points.length === 0
                      ? 'Bez punktów'
                      : points.map((point) => point.name?.trim() || 'Bez nazwy').join(', ')}
                  </span>
                </div>
                <span className={styles.dayCount}>{pluralize(points.length, PLACE_FORMS)}</span>
              </li>
            );
          })}
          {grouped.unassigned.length > 0 && (
            <li className={`${styles.dayRow} ${styles.dayRowMuted}`}>
              <span className={`${styles.dayBadge} ${styles.dayBadgeMuted}`}>?</span>
              <div className={styles.dayText}>
                <span className={styles.dayLabel}>Nieprzypisane do dnia</span>
                <span className={styles.dayNames}>
                  {grouped.unassigned.map((point) => point.name?.trim() || 'Bez nazwy').join(', ')}
                </span>
              </div>
              <span className={styles.dayCount}>{pluralize(grouped.unassigned.length, PLACE_FORMS)}</span>
            </li>
          )}
        </ol>
      )}
    </>
  );
};

const ManageTripPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [load, setLoad] = useState({ id: null, trip: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState(() => tripToForm(null));
  const [friends, setFriends] = useState([]);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isLockBusy, setIsLockBusy] = useState(false);
  const [isDangerBusy, setIsDangerBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    tripService
      .getById(id)
      .then((trip) => {
        if (cancelled) return;
        setLoad({ id, trip, error: null });
        setForm(tripToForm(trip));
      })
      .catch((err) => {
        if (!cancelled) setLoad({ id, trip: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  useEffect(() => {
    let cancelled = false;

    friendshipService
      .getFriends()
      .then((items) => {
        if (!cancelled) setFriends(items);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trip = load.id === id ? load.trip : null;
  const savedForm = useMemo(() => tripToForm(trip), [trip]);
  const isDirty = Boolean(trip) && !isSameForm(form, savedForm);
  const validation = validateTripForm(form);
  const errors = isDirty ? validation : {};
  const canSave = isDirty && Object.keys(validation).length === 0 && !isSaving;

  const visibleTabs = TABS.filter((tab) => !tab.ownerOnly || trip?.isOwner);
  const requestedTab = searchParams.get('tab');
  const activeTab = visibleTabs.some((tab) => tab.key === requestedTab) ? requestedTab : DEFAULT_TAB;

  const changeTab = (key) => {
    setSearchParams(key === DEFAULT_TAB ? {} : { tab: key }, { replace: true });
  };

  const markBusy = (userId, busy) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const updateTrip = (changes) => setLoad((prev) => ({ ...prev, trip: { ...prev.trip, ...changes } }));

  if (load.id !== id) {
    return <TripPanel eyebrow="Zarządzaj wyprawą" title="Wczytywanie wyprawy..." />;
  }

  if (!trip) {
    return (
      <TripPanel
        eyebrow="Zarządzaj wyprawą"
        title="Nie udało się wczytać wyprawy"
        footerNote={load.error}
        footerActions={
          <button type="button" className={panel.primaryBtn} onClick={() => setReloadToken((v) => v + 1)}>
            Spróbuj ponownie
          </button>
        }>
        <p className={panel.intro}>Wyprawa mogła zostać usunięta albo nie masz już do niej dostępu.</p>
      </TripPanel>
    );
  }

  const isPlanLocked = Boolean(trip.planLockedAt);
  const participants = trip.participants ?? [];
  const peopleCount = participants.length + 1;
  const owner = { id: trip.ownerId, username: trip.isOwner ? 'Ty' : trip.ownerUsername };
  const people = [{ id: trip.ownerId, username: trip.ownerUsername }, ...participants];
  const availableFriends = friends.filter(
    (friend) => friend.id !== trip.ownerId && !participants.some((p) => p.id === friend.id),
  );

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (saveError) setSaveError(null);
  };

  const handleDiscard = () => {
    setForm(savedForm);
    setSaveError(null);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = formToPayload(form);
      await tripService.update(id, payload);
      updateTrip(payload);
      setForm(tripToForm({ ...trip, ...payload }));
      toastSuccess('Zapisano zmiany.');
    } catch (err) {
      setSaveError(err.message || 'Nie udało się zapisać zmian.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddParticipant = async (friend) => {
    if (busyIds.has(friend.id)) return;
    markBusy(friend.id, true);
    try {
      await tripService.addParticipant(id, friend.id);
      updateTrip({
        participants: [...participants, { id: friend.id, username: friend.username }],
        participantCount: participants.length + 1,
      });
      toastSuccess(`Dodano @${friend.username} do wyprawy.`);
    } catch (err) {
      toastError(err.message);
    } finally {
      markBusy(friend.id, false);
    }
  };

  const handleRemoveParticipant = async (participant) => {
    const result = await swalConfirmDelete(
      `Usunąć @${participant.username}?`,
      'Ta osoba straci dostęp do planu tej wyprawy.',
    );
    if (!result.isConfirmed) return;

    markBusy(participant.id, true);
    try {
      await tripService.removeParticipant(id, participant.id);
      const remaining = participants.filter((p) => p.id !== participant.id);
      updateTrip({ participants: remaining, participantCount: remaining.length });
      toastSuccess('Uczestnik usunięty.');
    } catch (err) {
      toastError(err.message);
    } finally {
      markBusy(participant.id, false);
    }
  };

  const handleTogglePlanLock = async () => {
    setIsLockBusy(true);
    try {
      const lock = isPlanLocked ? await tripService.unlockPlan(id) : await tripService.lockPlan(id);
      updateTrip({ planLockedAt: lock.planLockedAt });
      toastSuccess(lock.isPlanLocked ? 'Plan zamknięty.' : 'Planowanie wznowione.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsLockBusy(false);
    }
  };

  const handleDelete = async () => {
    const result = await swalConfirmDelete(
      'Usunąć wyprawę?',
      'Znikną punkty i lista uczestników. Jeśli wyprawa jest opublikowana, publikacja zostanie wycofana.',
    );
    if (!result.isConfirmed) return;

    setIsDangerBusy(true);
    try {
      await tripService.delete(id);
      toastSuccess('Wyprawa usunięta.');
      navigate('/trips', { replace: true });
    } catch (err) {
      toastError(err.message);
      setIsDangerBusy(false);
    }
  };

  const handleLeave = async () => {
    const result = await swalConfirmDelete(
      'Opuścić wyprawę?',
      'Stracisz dostęp do planu. Organizator może zaprosić Cię ponownie.',
    );
    if (!result.isConfirmed) return;

    setIsDangerBusy(true);
    try {
      await tripService.leave(id);
      toastSuccess('Nie jesteś już uczestnikiem tej wyprawy.');
      navigate('/trips', { replace: true });
    } catch (err) {
      toastError(err.message);
      setIsDangerBusy(false);
    }
  };

  const tabs = visibleTabs.map((tab) => {
    if (tab.key === 'info') return { ...tab, badge: isDirty ? 'zmiany' : '' };
    if (tab.key === 'participants') return { ...tab, badge: String(peopleCount) };
    if (tab.key === 'settings') return { ...tab, badge: isPlanLocked ? 'zamknięty' : '' };
    return tab;
  });

  const range = formatRange(savedForm.startDate, savedForm.endDate);

  const meta = (
    <>
      <span className={panel.metaItem}>{range || 'Bez dat'}</span>
      <span className={panel.metaItem}>{pluralize(peopleCount, PEOPLE_FORMS)}</span>
      {isPlanLocked && (
        <span className={panel.metaChip}>
          <FontAwesomeIcon icon="lock" />
          Plan zamknięty
        </span>
      )}
    </>
  );

  const footerByTab = {
    info: {
      note: isDirty ? 'Masz niezapisane zmiany.' : 'Wszystko zapisane.',
      actions: (
        <>
          <button type="button" className={panel.ghostBtn} onClick={handleDiscard} disabled={!isDirty || isSaving}>
            Odrzuć
          </button>
          <button type="submit" form="manage-trip-details" className={panel.primaryBtn} disabled={!canSave}>
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </>
      ),
    },
    participants: {
      note: trip.isOwner ? 'Zmiany uczestników zapisują się od razu.' : 'Uczestników dodaje i usuwa organizator.',
    },
    points: { note: 'Punkty edytujesz razem z innymi w planerze.' },
    share: { note: 'Publikacja to kopia planu w Odkrywaj. Twoja wyprawa zostaje prywatna.' },
    settings: { note: trip.isOwner ? 'Blokadę planu zmienia tylko organizator.' : 'Ustawienia zmienia organizator.' },
  };

  const footer = footerByTab[activeTab];

  return (
    <TripPanel
      eyebrow="Zarządzaj wyprawą"
      title={trip.name}
      meta={meta}
      actions={
        <Link to={`/planner/${trip.id}`} className={panel.primaryBtn}>
          Otwórz planer
          <ArrowRight />
        </Link>
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={changeTab}
      tabsLabel="Sekcje wyprawy"
      aside={
        activeTab === 'info' ? (
          <TripPreviewCard name={form.name} startDate={form.startDate} endDate={form.endDate} people={people} />
        ) : null
      }
      alert={activeTab === 'info' ? saveError : null}
      footerNote={footer.note}
      footerActions={footer.actions}>
      {activeTab === 'info' && (
        <form id="manage-trip-details" onSubmit={handleSave} noValidate>
          <TripDetailsFields
            idPrefix="manage-trip"
            value={form}
            errors={errors}
            onChange={handleFieldChange}
            datesLocked={isPlanLocked}
          />
        </form>
      )}

      {activeTab === 'participants' && (
        <>
          <ul className={styles.people}>
            <li className={styles.personRow}>
              <Avatar id={owner.id} username={trip.ownerUsername} />
              <span className={styles.personName}>{trip.isOwner ? 'Ty' : `@${owner.username}`}</span>
              <span className={styles.ownerTag}>Organizator</span>
            </li>
            {participants.map((participant) => (
              <li key={participant.id} className={styles.personRow}>
                <Avatar id={participant.id} username={participant.username} />
                <span className={styles.personName}>@{participant.username}</span>
                {trip.isOwner && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveParticipant(participant)}
                    disabled={busyIds.has(participant.id)}
                    aria-label={`Usuń @${participant.username} z wyprawy`}>
                    Usuń
                  </button>
                )}
              </li>
            ))}
          </ul>

          {trip.isOwner && (
            <div className={styles.addSection}>
              <span className={panel.label}>Dodaj ze znajomych</span>
              <ParticipantPicker
                friends={availableFriends}
                busyIds={busyIds}
                onToggle={handleAddParticipant}
                label="Znajomi do dodania"
                emptyText={
                  friends.length === 0 ? (
                    <>
                      Nie masz jeszcze znajomych.{' '}
                      <Link to="/friends" className={styles.inlineLink}>
                        Dodaj ich w Znajomych
                      </Link>
                      .
                    </>
                  ) : (
                    'Wszyscy Twoi znajomi już są w tej wyprawie.'
                  )
                }
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'points' && <PointsOverview trip={trip} />}

      {activeTab === 'share' && trip.isOwner && <PublicationTab trip={trip} onGoToInfo={() => changeTab('info')} />}

      {activeTab === 'settings' && (
        <>
          <section className={`${styles.settingCard} ${isPlanLocked ? styles.settingCardLocked : ''}`}>
            <span className={styles.settingIcon}>
              <FontAwesomeIcon icon={isPlanLocked ? 'lock' : 'lock-open'} />
            </span>
            <div className={styles.settingText}>
              <span className={styles.settingTitle}>{isPlanLocked ? 'Plan zamknięty' : 'Planowanie trwa'}</span>
              <p className={styles.settingDescription}>
                {isPlanLocked
                  ? `Zamknięty ${formatLockedAt(trip.planLockedAt)}. Punkty i daty są tylko do odczytu dla wszystkich uczestników.`
                  : 'Gdy plan jest gotowy, zamknij go. Nikt nie zmieni już punktów ani dat, a eksport dalej działa. Wznowić możesz w każdej chwili.'}
              </p>
            </div>
            {trip.isOwner && (
              <button
                type="button"
                className={isPlanLocked ? panel.ghostBtn : panel.primaryBtn}
                onClick={handleTogglePlanLock}
                disabled={isLockBusy}>
                {isLockBusy ? 'Zapisywanie...' : isPlanLocked ? 'Wznów planowanie' : 'Zakończ planowanie'}
              </button>
            )}
          </section>

          <section className={`${styles.settingCard} ${styles.settingCardDanger}`}>
            <div className={styles.settingText}>
              <span className={`${styles.settingTitle} ${styles.dangerTitle}`}>
                {trip.isOwner ? 'Usuń wyprawę' : 'Opuść wyprawę'}
              </span>
              <p className={styles.settingDescription}>
                {trip.isOwner
                  ? 'Znikną punkty i lista uczestników. Tej operacji nie da się cofnąć.'
                  : 'Stracisz dostęp do planu. Organizator może zaprosić Cię ponownie.'}
              </p>
            </div>
            <button
              type="button"
              className={panel.dangerBtn}
              onClick={trip.isOwner ? handleDelete : handleLeave}
              disabled={isDangerBusy}>
              {isDangerBusy ? 'Chwila...' : trip.isOwner ? 'Usuń' : 'Opuść'}
            </button>
          </section>
        </>
      )}
    </TripPanel>
  );
};

export default ManageTripPage;
