import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { friendshipService } from '../../services/FriendshipService';
import { swalConfirmDelete, toastError, toastSuccess } from '../../utils/swal';
import { colorForUser } from '../../utils/useColor';
import { pluralize, DAY_FORMS, PLACE_FORMS } from '../../utils/pluralize';
import { peopleOf, roleLabel } from '../../utils/tripPeople';
import { countDays, describeWhen, formatRange, getTiming, toDateInput } from '../../components/TripPanel/tripForm';
import AvatarStack from '../../components/AvatarStack/AvatarStack';
import TripBadges from '../../components/TripBadges/TripBadges';
import TripThumbnail from '../../components/TripThumbnail/TripThumbnail';
import MapSketch from '../../components/TripThumbnail/MapSketch';
import UpcomingTrip from '../../components/UpcomingTrip/UpcomingTrip';
import { pickUpcomingTrip } from '../../components/UpcomingTrip/pickUpcomingTrip';
import styles from './TripsPage.module.scss';

const MAX_INVITES_SHOWN = 3;
const SKELETON_CARDS = 3;
const FRIEND_REQUESTS_EVENT = 'tripdrop:friend-requests-changed';

const TRIP_FORMS = { one: 'wyprawa', few: 'wyprawy', many: 'wypraw', other: 'wyprawy' };
const PUBLISHED_FORMS = { one: 'opublikowana', few: 'opublikowane', many: 'opublikowanych', other: 'opublikowanej' };

const pluralRules = new Intl.PluralRules('pl-PL');
const wordFor = (count, forms) => forms[pluralRules.select(count)] ?? forms.other;

const FILTERS = [
  { key: 'all', label: 'Wszystkie', match: () => true },
  { key: 'mine', label: 'Moje', match: (trip) => trip.isOwner },
  { key: 'joined', label: 'Uczestniczę', match: (trip) => !trip.isOwner },
  { key: 'locked', label: 'Plan zamknięty', match: (trip) => Boolean(trip.planLockedAt) },
];

const SORTS = [
  { key: 'soon', label: 'Najbliższe' },
  { key: 'newest', label: 'Ostatnio dodane' },
  { key: 'name', label: 'Alfabetycznie' },
];

const PHASE_ORDER = { ongoing: 0, upcoming: 1, undated: 2, past: 3 };

const byNewest = (a, b) => new Date(b.trip.createdAt) - new Date(a.trip.createdAt);

const bySoonest = (a, b) => {
  const byPhase = PHASE_ORDER[a.timing.phase] - PHASE_ORDER[b.timing.phase];
  if (byPhase !== 0) return byPhase;
  if (a.timing.phase === 'past') return b.timing.end - a.timing.end;
  if (a.timing.start !== null && b.timing.start !== null) return a.timing.start - b.timing.start;
  return byNewest(a, b);
};

const SORTERS = {
  soon: bySoonest,
  newest: byNewest,
  name: (a, b) => a.trip.name.localeCompare(b.trip.name, 'pl'),
};

const initialOf = (username) => (username || '?').trim().charAt(0).toUpperCase() || '?';

const ICON = {
  arrow: 'M5 12h14M12 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
};

const Icon = ({ name, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={styles.icon} aria-hidden="true">
    <path d={ICON[name]} />
  </svg>
);

const pointsLabel = (route) => {
  if (!route) return null;
  return route.pointCount > 0 ? pluralize(route.pointCount, PLACE_FORMS) : 'Bez punktów';
};

const TripCard = ({ trip, timing }) => {
  const start = toDateInput(trip.startDate);
  const end = toDateInput(trip.endDate);
  const days = countDays(start, end);
  const isPast = timing.phase === 'past';
  const points = pointsLabel(trip.route);

  return (
    <article className={`${styles.card} ${isPast ? styles.cardPast : ''}`}>
      <div className={styles.cardMap}>
        <TripThumbnail trip={trip} className={styles.thumb} />
        <div className={styles.mapOverlay}>
          <span className={styles.dateChip}>
            <Icon name="calendar" size={13} />
            {formatRange(start, end) || 'Bez dat'}
          </span>
          <span className={styles.mapBadges}>
            <TripBadges trip={trip} compact />
          </span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <span className={`${styles.when} ${isPast ? styles.whenPast : ''}`}>{describeWhen(start, end)}</span>
        <h3 className={styles.cardTitle}>
          <Link to={`/planner/${trip.id}`} className={styles.cardLink}>
            {trip.name}
          </Link>
        </h3>
        <p className={styles.metaRow}>
          {points && <span>{points}</span>}
          <span>{days > 0 ? pluralize(days, DAY_FORMS) : 'Daty do ustalenia'}</span>
        </p>

        <div className={styles.cardFooter}>
          <div className={styles.people}>
            <AvatarStack people={peopleOf(trip)} />
            <span className={styles.peopleLabel}>{roleLabel(trip)}</span>
          </div>
          <Link
            to={`/trips/${trip.id}/manage`}
            className={styles.iconBtn}
            aria-label={`Zarządzaj wyprawą: ${trip.name}`}
            title="Zarządzaj">
            <Icon name="pencil" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
};

const InvitesPanel = ({ invites, busyIds, onAnswer }) => (
  <aside className={styles.invites} aria-labelledby="invites-title">
    <div className={styles.invitesHead}>
      <h2 id="invites-title" className={styles.invitesTitle}>
        Zaproszenia
      </h2>
      <span className={styles.invitesCount}>{invites.length}</span>
    </div>
    <ul className={styles.invitesList}>
      {invites.slice(0, MAX_INVITES_SHOWN).map((invite) => {
        const username = invite.requester?.username ?? 'nieznany';
        const busy = busyIds.has(invite.id);
        return (
          <li key={invite.id} className={styles.invite}>
            <div className={styles.inviteWho}>
              <span
                className={styles.inviteAvatar}
                style={{ background: colorForUser(invite.requester?.id) }}
                aria-hidden="true">
                {initialOf(username)}
              </span>
              <div className={styles.inviteText}>
                <span className={styles.inviteName}>@{username}</span>
                <span className={styles.inviteHint}>chce dodać Cię do znajomych</span>
              </div>
            </div>
            <div className={styles.inviteActions}>
              <button
                type="button"
                className={styles.acceptBtn}
                onClick={() => onAnswer(invite, 'accept')}
                disabled={busy}
                aria-label={`Akceptuj zaproszenie od @${username}`}>
                {busy ? 'Chwila...' : 'Akceptuj'}
              </button>
              <button
                type="button"
                className={styles.declineBtn}
                onClick={() => onAnswer(invite, 'reject')}
                disabled={busy}
                aria-label={`Odrzuć zaproszenie od @${username}`}>
                Odrzuć
              </button>
            </div>
          </li>
        );
      })}
    </ul>
    <Link to="/friends" className={styles.invitesLink}>
      {invites.length > MAX_INVITES_SHOWN ? `Wszystkie zaproszenia (${invites.length})` : 'Wszyscy znajomi'}
      <Icon name="arrow" size={17} />
    </Link>
  </aside>
);

const TripsPage = () => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ version: null, trips: [], error: null });
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('soon');
  const [invitesVersion, setInvitesVersion] = useState(0);
  const [invites, setInvites] = useState([]);
  const [busyInvites, setBusyInvites] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    tripService
      .getAll()
      .then((trips) => {
        if (!cancelled) setResult({ version, trips: Array.isArray(trips) ? trips : [], error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult((prev) => ({ ...prev, version, error: err.message || 'Spróbuj ponownie za chwilę.' }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    let cancelled = false;

    friendshipService
      .getPending()
      .then((data) => {
        if (!cancelled) setInvites(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setInvites([]);
      });

    return () => {
      cancelled = true;
    };
  }, [invitesVersion]);

  useEffect(() => {
    const reload = () => setInvitesVersion((v) => v + 1);
    window.addEventListener(FRIEND_REQUESTS_EVENT, reload);
    return () => window.removeEventListener(FRIEND_REQUESTS_EVENT, reload);
  }, []);

  const isLoading = result.version !== version;
  const hasError = !isLoading && Boolean(result.error);
  const isReady = !isLoading && !hasError;
  const trips = result.trips;

  const items = useMemo(
    () => trips.map((trip) => ({ trip, timing: getTiming(trip.startDate, trip.endDate) })),
    [trips],
  );

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, trips.filter(f.match).length])), [trips]);

  const stats = useMemo(() => {
    const published = trips.filter((trip) => trip.publicationVisibility).length;
    return [
      { key: 'all', value: trips.length, label: wordFor(trips.length, TRIP_FORMS) },
      { key: 'locked', value: counts.locked, label: 'z zamkniętym planem' },
      { key: 'published', value: published, label: wordFor(published, PUBLISHED_FORMS) },
    ].filter((stat) => stat.key === 'all' || stat.value > 0);
  }, [trips, counts.locked]);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const visible = items.filter((item) => activeFilter.match(item.trip));
  const featured = pickUpcomingTrip(visible.map((item) => item.trip));
  const rest = visible.filter((item) => item.trip !== featured).sort(SORTERS[sort]);

  const handleInviteAnswer = async (invite, action) => {
    const username = invite.requester?.username ?? 'nieznany';

    if (action === 'reject') {
      const confirmation = await swalConfirmDelete('Odrzucić zaproszenie?', `@${username} nie dostanie powiadomienia.`);
      if (!confirmation.isConfirmed) return;
    }

    setBusyInvites((prev) => new Set(prev).add(invite.id));
    try {
      if (action === 'accept') {
        await friendshipService.accept(invite.id);
        toastSuccess(`@${username} jest teraz w Twoich znajomych.`);
      } else {
        await friendshipService.reject(invite.id);
        toastSuccess('Zaproszenie odrzucone.');
      }
      setInvites((prev) => prev.filter((item) => item.id !== invite.id));
      window.dispatchEvent(new Event(FRIEND_REQUESTS_EVENT));
    } catch (err) {
      toastError(err.message || 'Nie udało się odpowiedzieć na zaproszenie.');
    } finally {
      setBusyInvites((prev) => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  const listTitle = featured ? 'Pozostałe wyprawy' : filter === 'all' ? 'Wszystkie wyprawy' : activeFilter.label;
  const showListHead = rest.length > 0 || filter !== 'all';
  const emptyFilterText = featured
    ? 'Poza wyprawą powyżej nic więcej nie pasuje do tego filtra.'
    : 'Żadna wyprawa nie pasuje do tego filtra.';

  const invitesPanel =
    invites.length > 0 ? <InvitesPanel invites={invites} busyIds={busyInvites} onAnswer={handleInviteAnswer} /> : null;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <svg className={styles.heroArt} viewBox="0 0 1440 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className={styles.contours}>
            <path d="M1010 170c0-80 70-140 160-136s150 66 144 144-74 128-160 124-144-48-144-132z" />
            <path d="M960 172c2-108 96-188 214-182s200 90 192 194-100 172-214 166-194-64-192-178z" />
            <path d="M910 176c4-136 122-236 268-228s250 112 240 244-126 216-268 208-244-80-240-224z" />
            <path d="M860 180c6-164 148-284 322-274s300 136 288 294-152 260-322 250-294-96-288-270z" />
          </g>
          <path className={styles.trail} d="M700 330 C780 250 850 270 930 210 S1050 110 1140 130 S1290 90 1380 30" />
          <circle className={styles.trailStop} cx="930" cy="210" r="6" />
          <circle className={`${styles.trailStop} ${styles.trailStopBrown}`} cx="1140" cy="130" r="6" />
          <circle className={`${styles.trailStop} ${styles.trailStopSage}`} cx="1380" cy="30" r="6" />
        </svg>

        <div className={styles.heroInner}>
          <div className={styles.heroTop}>
            <div className={styles.heroText}>
              <h1 className={styles.title}>
                Twoje <em>wycieczki</em>
              </h1>
              {isReady && trips.length > 0 && (
                <dl className={styles.stats}>
                  {stats.map((stat) => (
                    <div key={stat.key} className={styles.stat}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <Link to="/trips/new" className={styles.newBtn}>
              <span className={styles.newBtnIcon}>
                <Icon name="plus" size={18} />
              </span>
              Nowa wyprawa
            </Link>
          </div>

          {isReady && trips.length > 0 && (
            <div className={styles.filters} role="group" aria-label="Filtruj wycieczki">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  className={`${styles.filter} ${filter === f.key ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f.key)}>
                  {f.label}
                  <span className={styles.filterCount}>{counts[f.key]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.content}>
        {isLoading && (
          <div className={styles.skeletonWrap} aria-busy="true" aria-label="Wczytywanie wycieczek">
            <div className={`${styles.skeleton} ${styles.skeletonFeatured}`} />
            <div className={styles.grid}>
              {Array.from({ length: SKELETON_CARDS }, (_, i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
              ))}
            </div>
          </div>
        )}

        {hasError && (
          <div className={styles.errorState} role="alert">
            <div className={styles.errorText}>
              <strong>Nie udało się wczytać wycieczek</strong>
              <span>{result.error}</span>
            </div>
            <button type="button" className={styles.ghostBtn} onClick={() => setVersion((v) => v + 1)}>
              Spróbuj ponownie
            </button>
          </div>
        )}

        {isReady && trips.length === 0 && (
          <div className={styles.columns}>
            <div className={styles.emptyState}>
              <div className={styles.emptyMap}>
                <MapSketch seed="pusta-mapa" />
              </div>
              <div className={styles.emptyBody}>
                <h2 className={styles.emptyTitle}>Mapa czeka na pierwszą trasę</h2>
                <p className={styles.emptyText}>
                  Załóż wyprawę, zaproś znajomych i planujcie razem. Gotowe trasy innych znajdziesz w Odkrywaj.
                </p>
                <div className={styles.emptyActions}>
                  <Link to="/trips/new" className={styles.primaryBtn}>
                    Zaplanuj pierwszą wyprawę
                    <Icon name="arrow" size={17} />
                  </Link>
                  <Link to="/explore" className={styles.ghostBtn}>
                    Przeglądaj trasy
                  </Link>
                </div>
              </div>
            </div>
            {invitesPanel}
          </div>
        )}

        {isReady && trips.length > 0 && (
          <>
            {featured && <UpcomingTrip trip={featured} />}

            <div className={styles.columns}>
              <section
                className={styles.listSection}
                aria-labelledby={showListHead ? 'trips-list-title' : undefined}
                aria-label={showListHead ? undefined : 'Pozostałe wyprawy'}>
                {showListHead && (
                  <div className={styles.listHead}>
                    <h2 id="trips-list-title" className={styles.sectionTitle}>
                      {listTitle}
                    </h2>
                    {rest.length > 1 && (
                      <div className={styles.sort}>
                        <label htmlFor="trips-sort" className={styles.sortLabel}>
                          Sortuj
                        </label>
                        <select
                          id="trips-sort"
                          className={styles.select}
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}>
                          {SORTS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {rest.length === 0 && filter !== 'all' && <p className={styles.emptyFilter}>{emptyFilterText}</p>}

                {rest.length > 0 && (
                  <div className={styles.grid}>
                    {rest.map(({ trip, timing }) => (
                      <TripCard key={trip.id} trip={trip} timing={timing} />
                    ))}
                  </div>
                )}

                <Link to="/trips/new" className={styles.newRow}>
                  <span className={styles.newRowIcon}>
                    <Icon name="plus" size={20} />
                  </span>
                  <span className={styles.newRowText}>
                    <strong>Zaplanuj kolejną wyprawę</strong>
                    <span>Wystarczy nazwa i daty, znajomych dodasz później.</span>
                  </span>
                </Link>
              </section>

              {invitesPanel}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TripsPage;
