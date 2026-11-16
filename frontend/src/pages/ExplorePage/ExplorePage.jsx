import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { exploreService } from '../../services/ExploreService';
import useAuth from '../../hooks/useAuth';
import { swalError, toastError } from '../../utils/swal';
import { PUBLICATION_TAGS, PUBLICATION_TAG_LABELS } from '../../utils/publicationTags';
import { pluralize, PLACE_FORMS, DAY_FORMS } from '../../utils/pluralize';
import { formatDistance } from '../../utils/routeFormat';
import RouteSilhouette from '../../components/RouteSilhouette/RouteSilhouette';
import VoteButton from '../../components/VoteButton/VoteButton';
import styles from './ExplorePage.module.scss';

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_COUNT = 6;
const MAX_CARD_TAGS = 3;

const LENGTH_OPTIONS = [
  { value: '', label: 'Dowolna długość' },
  { value: '1', label: '1 dzień', minDays: 1, maxDays: 1 },
  { value: '2-3', label: 'Weekend (2-3 dni)', minDays: 2, maxDays: 3 },
  { value: '4+', label: '4 dni i więcej', minDays: 4 },
];

const SORT_OPTIONS = [
  { value: '', label: 'Najnowsze' },
  { value: 'hot', label: 'Najwyżej oceniane' },
  { value: 'popular', label: 'Najczęściej kopiowane' },
];

const parseTags = (value) => (value ? value.split(',').filter((tag) => PUBLICATION_TAG_LABELS[tag]) : []);

const buildParams = (q, tagsParam, length, sort) => {
  const lengthOption = LENGTH_OPTIONS.find((option) => option.value === length);
  return {
    search: q,
    tags: parseTags(tagsParam),
    minDays: lengthOption?.minDays,
    maxDays: lengthOption?.maxDays,
    sort,
  };
};

const makeKey = (...parts) => parts.join('|');

const routesLabel = (count, hasMore) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let noun = 'tras';
  if (count === 1) noun = 'trasa';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) noun = 'trasy';
  return hasMore ? `Ponad ${count} ${noun}` : `${count} ${noun}`;
};

const copiesLabel = (count) => {
  if (!count) return 'jeszcze nie kopiowana';
  return `skopiowano ${count} ${count === 1 ? 'raz' : 'razy'}`;
};

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      fill="currentColor"
    />
  </svg>
);

const getFeaturedBadge = (sort, trip) => {
  if (sort === 'hot') {
    return trip.voteCount > 0 ? { label: 'Najwyżej oceniana trasa', icon: <FlameIcon /> } : null;
  }
  if (sort === 'popular') {
    return trip.copyCount > 0
      ? { label: 'Najczęściej kopiowana', icon: <FontAwesomeIcon icon="copy" aria-hidden="true" /> }
      : null;
  }
  return { label: 'Najnowsza trasa', icon: null };
};

const TripMeta = ({ trip, className = '' }) => {
  const items = [
    pluralize(trip.pointCount, PLACE_FORMS),
    trip.totalDistanceM != null ? formatDistance(trip.totalDistanceM) : null,
    trip.author ? `@${trip.author}` : null,
  ].filter(Boolean);

  return (
    <p className={`${styles.meta} ${className}`}>
      {items.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </p>
  );
};

const TripTags = ({ tags }) => {
  if (!tags?.length) return null;
  const extra = tags.length - MAX_CARD_TAGS;

  return (
    <div className={styles.tagList}>
      {tags.slice(0, MAX_CARD_TAGS).map((key) => (
        <span key={key} className={styles.tagChip}>
          {PUBLICATION_TAG_LABELS[key] ?? key}
        </span>
      ))}
      {extra > 0 && <span className={styles.tagChip}>+{extra}</span>}
    </div>
  );
};

const FeaturedTrip = ({ trip, badge, votePending, onVote }) => (
  <article className={styles.featured}>
    <div className={styles.featuredMap}>
      <RouteSilhouette preview={trip.preview} className={styles.silhouette} label={`Szkic trasy: ${trip.title}`} />
      {badge && (
        <span className={styles.featuredBadge}>
          {badge.icon}
          {badge.label}
        </span>
      )}
      <span className={`${styles.daysChip} ${styles.featuredDays}`}>{pluralize(trip.dayCount, DAY_FORMS)}</span>
    </div>
    <div className={styles.featuredBody}>
      {trip.region && <span className={styles.region}>{trip.region}</span>}
      <h3 className={styles.featuredTitle}>
        <Link to={`/explore/${trip.id}`} className={styles.cardLink}>
          {trip.title}
        </Link>
      </h3>
      <TripMeta trip={trip} className={styles.featuredMeta} />
      <TripTags tags={trip.tags} />
      <div className={styles.featuredFooter}>
        <span className={styles.copies}>
          <FontAwesomeIcon icon="copy" aria-hidden="true" />
          {copiesLabel(trip.copyCount)}
        </span>
        <div className={styles.voteSlot}>
          <VoteButton count={trip.voteCount} voted={trip.hasVoted} pending={votePending} onClick={() => onVote(trip)} />
        </div>
      </div>
    </div>
  </article>
);

const TripCard = ({ trip, votePending, onVote }) => (
  <article className={styles.card}>
    <div className={styles.cardMap}>
      <RouteSilhouette preview={trip.preview} className={styles.silhouette} label={`Szkic trasy: ${trip.title}`} />
      <span className={styles.daysChip}>{pluralize(trip.dayCount, DAY_FORMS)}</span>
    </div>
    <div className={styles.cardBody}>
      {trip.region && <span className={styles.region}>{trip.region}</span>}
      <h3 className={styles.cardTitle}>
        <Link to={`/explore/${trip.id}`} className={styles.cardLink}>
          {trip.title}
        </Link>
      </h3>
      <TripMeta trip={trip} />
      <TripTags tags={trip.tags} />
      <div className={styles.cardFooter}>
        <span className={styles.copies}>
          <FontAwesomeIcon icon="copy" aria-hidden="true" />
          {copiesLabel(trip.copyCount)}
        </span>
        <div className={styles.voteSlot}>
          <VoteButton
            size="sm"
            count={trip.voteCount}
            voted={trip.hasVoted}
            pending={votePending}
            onClick={() => onVote(trip)}
          />
        </div>
      </div>
    </div>
  </article>
);

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const q = searchParams.get('q') ?? '';
  const tagsParam = searchParams.get('tags') ?? '';
  const length = searchParams.get('days') ?? '';
  const sort = searchParams.get('sort') ?? '';

  const selectedTags = useMemo(() => parseTags(tagsParam), [tagsParam]);
  const hasFilters = Boolean(q || tagsParam || length || sort);

  const [searchInput, setSearchInput] = useState(q);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], hasMore: false, error: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingVotes, setPendingVotes] = useState(() => new Set());

  const queryKey = makeKey(q, tagsParam, length, sort, reloadToken);
  const isLoading = result.key !== queryKey;

  useEffect(() => {
    const key = makeKey(q, tagsParam, length, sort, reloadToken);
    const controller = new AbortController();

    exploreService
      .getTrips({ ...buildParams(q, tagsParam, length, sort), skip: 0, take: PAGE_SIZE }, { signal: controller.signal })
      .then((page) => setResult({ key, items: page.items, hasMore: page.hasMore, error: null }))
      .catch((err) => {
        if (err.canceled) return;
        setResult({ key, items: [], hasMore: false, error: err.message });
      });

    return () => controller.abort();
  }, [q, tagsParam, length, sort, reloadToken]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === q) return undefined;

    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (trimmed) next.set('q', trimmed);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput, q, setSearchParams]);

  const updateParam = (name, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const toggleTag = (key) => {
    const next = selectedTags.includes(key) ? selectedTags.filter((tag) => tag !== key) : [...selectedTags, key];
    updateParam('tags', next.join(','));
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const handleLoadMore = async () => {
    const key = queryKey;
    setIsLoadingMore(true);
    try {
      const page = await exploreService.getTrips({
        ...buildParams(q, tagsParam, length, sort),
        skip: result.items.length,
        take: PAGE_SIZE,
      });

      setResult((prev) => {
        if (prev.key !== key) return prev;
        const known = new Set(prev.items.map((item) => item.id));
        return {
          ...prev,
          items: [...prev.items, ...page.items.filter((item) => !known.has(item.id))],
          hasMore: page.hasMore,
        };
      });
    } catch (err) {
      swalError('Błąd', err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const updateItem = (tripId, changes) =>
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === tripId ? { ...item, ...changes } : item)),
    }));

  const handleVote = async (trip) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    if (pendingVotes.has(trip.id)) return;

    const nextVoted = !trip.hasVoted;

    updateItem(trip.id, { hasVoted: nextVoted, voteCount: trip.voteCount + (nextVoted ? 1 : -1) });
    setPendingVotes((prev) => new Set(prev).add(trip.id));

    try {
      const saved = nextVoted ? await exploreService.vote(trip.id) : await exploreService.unvote(trip.id);
      updateItem(trip.id, { hasVoted: saved.hasVoted, voteCount: saved.voteCount });
    } catch (err) {
      updateItem(trip.id, { hasVoted: trip.hasVoted, voteCount: trip.voteCount });
      toastError(err.message);
    } finally {
      setPendingVotes((prev) => {
        const next = new Set(prev);
        next.delete(trip.id);
        return next;
      });
    }
  };

  const [featured, ...rest] = result.items;
  const featuredBadge = featured ? getFeaturedBadge(sort, featured) : null;

  let listTitle = routesLabel(result.items.length, result.hasMore);
  if (isLoading) listTitle = 'Szukam tras...';
  else if (result.error) listTitle = 'Nie udało się pobrać tras';

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <svg className={styles.heroArt} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className={styles.contours}>
            <path d="M1000 210c0-90 80-160 180-156s170 74 164 164-84 146-182 142-162-54-162-150z" />
            <path d="M950 214c2-120 106-212 238-206s226 100 218 220-112 196-238 190-220-72-218-204z" />
            <path d="M900 218c4-150 132-264 296-256s282 124 272 274-140 246-296 238-276-90-272-256z" />
            <path d="M850 222c6-180 158-316 354-306s338 148 326 330-168 294-354 286-332-108-326-310z" />
          </g>
          <path className={styles.trail} d="M820 400 C900 330 960 350 1040 280 S1150 170 1230 190 S1350 120 1440 60" />
          <circle className={styles.trailStop} cx="1040" cy="280" r="7" />
          <circle className={`${styles.trailStop} ${styles.trailStopLight}`} cx="1230" cy="190" r="7" />
          <circle className={styles.trailStop} cx="1384" cy="96" r="7" />
        </svg>

        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>Trasy społeczności</span>
            <h1 className={styles.title}>
              Trasy, które ktoś już <em>przeszedł</em>
            </h1>
            <p className={styles.subtitle}>Skopiuj gotowy plan do swoich wycieczek i dopasuj go do siebie.</p>
          </div>

          <form role="search" className={styles.searchForm} onSubmit={handleSearchSubmit}>
            <label htmlFor="explore-search" className={styles.srOnly}>
              Szukaj tras
            </label>
            <div className={styles.searchField}>
              <FontAwesomeIcon icon="magnifying-glass" aria-hidden="true" />
              <input
                id="explore-search"
                type="search"
                placeholder="Miasto, region albo nazwa trasy"
                value={searchInput}
                maxLength={100}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.searchBtn}>
              Szukaj
            </button>
          </form>

          <div className={styles.tags} role="group" aria-label="Filtruj po tagach">
            {PUBLICATION_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag.key);
              return (
                <button
                  key={tag.key}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.tag} ${selected ? styles.tagSelected : ''}`}
                  onClick={() => toggleTag(tag.key)}>
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h2 className={styles.listTitle} aria-live="polite">
            {listTitle}
          </h2>
          <div className={styles.controls}>
            <div className={styles.segmented} role="group" aria-label="Sortowanie">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value || 'newest'}
                  type="button"
                  aria-pressed={sort === option.value}
                  className={`${styles.segment} ${sort === option.value ? styles.segmentActive : ''}`}
                  onClick={() => updateParam('sort', option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
            <select
              className={styles.select}
              value={length}
              aria-label="Długość wycieczki"
              onChange={(e) => updateParam('days', e.target.value)}>
              {LENGTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button type="button" className={styles.reset} onClick={resetFilters}>
                Wyczyść filtry
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading} aria-busy="true" aria-label="Ładowanie tras">
            <div className={styles.featuredSkeleton} />
            <div className={styles.grid}>
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          </div>
        ) : result.error ? (
          <div className={`${styles.state} ${styles.stateError}`} role="alert">
            <p>{result.error}</p>
            <button type="button" className={styles.secondaryBtn} onClick={() => setReloadToken((token) => token + 1)}>
              Spróbuj ponownie
            </button>
          </div>
        ) : !featured ? (
          <div className={styles.state}>
            <p>
              {hasFilters
                ? 'Żadna trasa nie pasuje do wybranych filtrów. Zmień tag albo wpisz coś innego.'
                : 'Nikt jeszcze nie opublikował trasy. Bądź pierwszy!'}
            </p>
            {hasFilters && (
              <button type="button" className={styles.secondaryBtn} onClick={resetFilters}>
                Wyczyść filtry
              </button>
            )}
          </div>
        ) : (
          <>
            <FeaturedTrip
              trip={featured}
              badge={featuredBadge}
              votePending={pendingVotes.has(featured.id)}
              onVote={handleVote}
            />

            {rest.length > 0 && (
              <div className={styles.grid}>
                {rest.map((trip) => (
                  <TripCard key={trip.id} trip={trip} votePending={pendingVotes.has(trip.id)} onVote={handleVote} />
                ))}
              </div>
            )}

            {result.hasMore && (
              <div className={styles.more}>
                <button type="button" className={styles.secondaryBtn} disabled={isLoadingMore} onClick={handleLoadMore}>
                  {isLoadingMore ? 'Ładowanie...' : 'Pokaż więcej tras'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
