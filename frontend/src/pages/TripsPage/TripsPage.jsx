import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tripService } from '../../services/TripService';
import { friendshipService } from '../../services/FriendshipService';
import { swalConfirmDelete, toastError, toastSuccess } from '../../utils/swal';
import { colorForUser } from '../../utils/useColor';
import { pluralize, DAY_FORMS } from '../../utils/pluralize';
import { countDays, describeWhen, formatRange, getTiming, toDateInput } from '../../components/TripPanel/tripForm';
import styles from './TripsPage.module.scss';

const MAX_AVATARS = 4;
const MAX_INVITES_SHOWN = 3;
const SKELETON_CARDS = 3;
const FRIEND_REQUESTS_EVENT = 'tripdrop:friend-requests-changed';

const TRIP_FORMS = { one: 'wyprawa', few: 'wyprawy', many: 'wypraw', other: 'wyprawy' };
const PUBLISHED_FORMS = { one: 'opublikowana', few: 'opublikowane', many: 'opublikowanych', other: 'opublikowanej' };
const PEOPLE_FORMS = { one: 'osoba', few: 'osoby', many: 'osób', other: 'osoby' };

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

const ticketDay = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', timeZone: 'UTC' });
const ticketMonth = new Intl.DateTimeFormat('pl-PL', { month: 'short', timeZone: 'UTC' });

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

const isActivePhase = (phase) => phase === 'upcoming' || phase === 'ongoing';

const peopleOf = (trip) => [
  { id: trip.ownerId, username: trip.ownerUsername || 'organizator' },
  ...(trip.participants ?? []),
];

const initialOf = (username) => (username || '?').trim().charAt(0).toUpperCase() || '?';

const roleLabel = (trip) => {
  if (!trip.isOwner) return `Organizuje @${trip.ownerUsername}`;
  const others = trip.participants ?? [];
  if (others.length === 0) return 'Tylko Ty';
  if (others.length === 1) return `Ty i @${others[0].username}`;
  return `Ty i ${pluralize(others.length, PEOPLE_FORMS)}`;
};

const datesOf = (trip) => ({ start: toDateInput(trip.startDate), end: toDateInput(trip.endDate) });

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRandom = (seed) => {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const MapArt = ({ seed }) => {
  const shapes = useMemo(() => {
    const random = createRandom(hashString(String(seed)));
    const hill = { cx: 120 + random() * 120, cy: 40 + random() * 60, rx: 24 + random() * 14, ry: 16 + random() * 10 };
    const park = { cx: 30 + random() * 80, cy: 100 + random() * 40, rx: 30 + random() * 16, ry: 18 + random() * 10 };
    const roadY = 70 + random() * 60;
    const bend = random() * 50 - 25;
    const road = `M-10 ${roadY} C 90 ${roadY + bend}, 200 ${roadY - bend}, 310 ${roadY + bend / 2}`;
    const sideX = 60 + random() * 180;
    const side = `M${sideX} -10 C ${sideX + 20} 50, ${sideX - 30} 110, ${sideX + 10} 170`;
    const waterY = 20 + random() * 40;
    const water = random() > 0.5 ? `M-10 ${waterY} C 80 ${waterY + 30}, 180 ${waterY - 20}, 310 ${waterY + 10}` : null;
    return { hill, park, road, side, water };
  }, [seed]);

  const { hill, park, road, side, water } = shapes;

  return (
    <svg className={styles.mapArt} viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="160" className={styles.mapGround} />
      <ellipse cx={park.cx} cy={park.cy} rx={park.rx} ry={park.ry} className={styles.mapPark} />
      {water && <path d={water} className={styles.mapWater} />}
      {[1, 1.5, 2.1, 2.8].map((scale) => (
        <ellipse
          key={scale}
          cx={hill.cx}
          cy={hill.cy}
          rx={hill.rx * scale}
          ry={hill.ry * scale}
          className={styles.mapContour}
        />
      ))}
      <path d={side} className={styles.mapRoadSmall} />
      <path d={road} className={styles.mapRoad} />
    </svg>
  );
};

const ICON = {
  arrow: 'M5 12h14M12 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
};

const Icon = ({ name, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={styles.icon} aria-hidden="true">
    <path d={ICON[name]} />
  </svg>
);

const AvatarStack = ({ people, large = false }) => {
  const shown = people.slice(0, MAX_AVATARS);
  const extra = people.length - shown.length;

  return (
    <div
      className={`${styles.avatars} ${large ? styles.avatarsLarge : ''}`}
      role="img"
      aria-label={`Uczestnicy: ${people.map((p) => `@${p.username}`).join(', ')}`}>
      {shown.map((person) => (
        <span key={person.id} className={styles.avatar} style={{ background: colorForUser(person.id) }}>
          {initialOf(person.username)}
        </span>
      ))}
      {extra > 0 && <span className={`${styles.avatar} ${styles.avatarMore}`}>+{extra}</span>}
    </div>
  );
};

const TripBadges = ({ trip }) => (
  <>
    {trip.planLockedAt && (
      <span className={`${styles.badge} ${styles.badgeLocked}`}>
        <Icon name="lock" size={13} />
        Plan zamknięty
      </span>
    )}
    {trip.publicationVisibility && (
      <span className={`${styles.badge} ${styles.badgePublished}`}>
        <Icon name={trip.publicationVisibility === 'public' ? 'globe' : 'link'} size={13} />
        {trip.publicationVisibility === 'public' ? 'Opublikowana' : 'Przez link'}
      </span>
    )}
  </>
);

const TicketPart = ({ time, light = false }) => (
  <span className={`${styles.ticketPart} ${light ? styles.ticketPartLight : ''}`}>
    <span className={styles.ticketMonth}>{ticketMonth.format(new Date(time))}</span>
    <span className={styles.ticketDay}>{ticketDay.format(new Date(time))}</span>
  </span>
);

const Ticket = ({ timing }) => (
  <div className={styles.ticket} aria-hidden="true">
    <TicketPart time={timing.start} />
    {timing.end !== timing.start && (
      <>
        <span className={styles.ticketArrow}>
          <Icon name="arrow" />
        </span>
        <TicketPart time={timing.end} light />
      </>
    )}
  </div>
);

const FeaturedTrip = ({ trip, timing }) => {
  const { start, end } = datesOf(trip);
  const days = countDays(start, end);
  const people = peopleOf(trip);

  return (
    <article className={styles.featured}>
      <div className={styles.featuredMap}>
        <MapArt seed={trip.id} />
        {timing.start !== null && <Ticket timing={timing} />}
      </div>

      <div className={styles.featuredBody}>
        <div className={styles.labels}>
          <span className={styles.eyebrow}>{timing.phase === 'ongoing' ? 'Trwa teraz' : 'Najbliższa wyprawa'}</span>
          {timing.phase === 'upcoming' && <span className={styles.countdown}>{describeWhen(start, end)}</span>}
          <TripBadges trip={trip} />
        </div>

        <div className={styles.featuredHeading}>
          <h2 className={styles.featuredTitle}>
            <Link to={`/planner/${trip.id}`} className={styles.titleLink}>
              {trip.name}
            </Link>
          </h2>
          <p className={styles.metaRow}>
            <span>{formatRange(start, end) || 'Daty do ustalenia'}</span>
            {days > 0 && <span>{pluralize(days, DAY_FORMS)}</span>}
            <span>{pluralize(people.length, PEOPLE_FORMS)}</span>
          </p>
        </div>

        {trip.description && <p className={styles.featuredDesc}>{trip.description}</p>}

        <div className={styles.featuredFooter}>
          <div className={styles.people}>
            <AvatarStack people={people} large />
            <span className={styles.peopleLabel}>{roleLabel(trip)}</span>
          </div>
          <div className={styles.featuredActions}>
            <Link to={`/trips/${trip.id}/manage`} className={styles.ghostBtn}>
              Zarządzaj
            </Link>
            <Link to={`/planner/${trip.id}`} className={styles.primaryBtn}>
              Otwórz planer
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

const TripCard = ({ trip, timing }) => {
  const { start, end } = datesOf(trip);
  const days = countDays(start, end);
  const people = peopleOf(trip);
  const isPast = timing.phase === 'past';

  return (
    <article className={`${styles.card} ${isPast ? styles.cardPast : ''}`}>
      <div className={styles.cardMap}>
        <MapArt seed={trip.id} />
        <div className={styles.mapBadges}>
          <TripBadges trip={trip} />
        </div>
        <span className={styles.dateChip}>
          <Icon name="calendar" size={13} />
          {formatRange(start, end) || 'Bez dat'}
        </span>
      </div>

      <div className={styles.cardBody}>
        <span className={`${styles.when} ${isPast ? styles.whenPast : ''}`}>{describeWhen(start, end)}</span>
        <h3 className={styles.cardTitle}>
          <Link to={`/planner/${trip.id}`} className={styles.cardLink}>
            {trip.name}
          </Link>
        </h3>
        <p className={styles.metaRow}>
          <span>{days > 0 ? pluralize(days, DAY_FORMS) : 'Daty do ustalenia'}</span>
          <span>{pluralize(people.length, PEOPLE_FORMS)}</span>
        </p>

        <div className={styles.cardFooter}>
          <div className={styles.people}>
            <AvatarStack people={people} />
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
                className={`${styles.avatar} ${styles.avatarMedium}`}
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
  const nearest = [...visible].sort(bySoonest)[0];
  const featured = nearest && isActivePhase(nearest.timing.phase) ? nearest : null;
  const rest = visible.filter((item) => item !== featured).sort(SORTERS[sort]);

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
                <MapArt seed="pusta-mapa" />
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
            {featured && <FeaturedTrip trip={featured.trip} timing={featured.timing} />}

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
