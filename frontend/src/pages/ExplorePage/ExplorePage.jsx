import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { exploreService } from '../../services/ExploreService';
import { swalError } from '../../utils/swal';
import { PUBLICATION_TAGS, PUBLICATION_TAG_LABELS } from '../../utils/publicationTags';
import { pluralize, PLACE_FORMS, DAY_FORMS } from '../../utils/pluralize';
import { formatDistance } from '../../utils/routeFormat';
import RouteSilhouette from '../../components/RouteSilhouette/RouteSilhouette';
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
  { value: 'popular', label: 'Najczęściej kopiowane' },
];

const parseTags = (value) =>
  value ? value.split(',').filter((tag) => PUBLICATION_TAG_LABELS[tag]) : [];

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

const TripCard = ({ trip }) => {
  const extraTags = trip.tags.length - MAX_CARD_TAGS;
  const meta = [
    pluralize(trip.dayCount, DAY_FORMS),
    pluralize(trip.pointCount, PLACE_FORMS),
    trip.totalDistanceM != null ? formatDistance(trip.totalDistanceM) : null,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <Link to={`/explore/${trip.id}`} className={styles.card}>
      <div className={styles.cardMap}>
        <RouteSilhouette
          preview={trip.preview}
          className={styles.silhouette}
          label={`Szkic trasy: ${trip.title}`}
        />
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{trip.title}</h2>
        <p className={styles.cardSub}>
          {[trip.region, `@${trip.author}`].filter(Boolean).join(' - ')}
        </p>
        <p className={styles.cardMeta}>{meta}</p>
        <div className={styles.cardFooter}>
          <div className={styles.cardTags}>
            {trip.tags.slice(0, MAX_CARD_TAGS).map((key) => (
              <span key={key} className={styles.cardTag}>
                {PUBLICATION_TAG_LABELS[key] ?? key}
              </span>
            ))}
            {extraTags > 0 && <span className={styles.cardTag}>+{extraTags}</span>}
          </div>
          {trip.copyCount > 0 && (
            <span className={styles.copies} title="Ile razy skopiowano">
              <FontAwesomeIcon icon="copy" /> {trip.copyCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

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

  const queryKey = makeKey(q, tagsParam, length, sort, reloadToken);
  const isLoading = result.key !== queryKey;

  useEffect(() => {
    const key = makeKey(q, tagsParam, length, sort, reloadToken);
    const controller = new AbortController();

    exploreService
      .getTrips(
        { ...buildParams(q, tagsParam, length, sort), skip: 0, take: PAGE_SIZE },
        { signal: controller.signal }
      )
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
        { replace: true }
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
      { replace: true }
    );
  };

  const toggleTag = (key) => {
    const next = selectedTags.includes(key)
      ? selectedTags.filter((tag) => tag !== key)
      : [...selectedTags, key];
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Odkrywaj</h1>
        <p className={styles.subtitle}>
          Trasy opublikowane przez innych. Znajdź inspirację, skopiuj ją do swoich wycieczek
          i dopasuj do siebie.
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <FontAwesomeIcon icon="magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            placeholder="Szukaj po nazwie lub regionie"
            value={searchInput}
            maxLength={100}
            aria-label="Szukaj tras"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>

        <select
          className={styles.select}
          value={length}
          aria-label="Długość wycieczki"
          onChange={(e) => updateParam('days', e.target.value)}
        >
          {LENGTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={sort}
          aria-label="Sortowanie"
          onChange={(e) => updateParam('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tags} role="group" aria-label="Filtruj po tagach">
        {PUBLICATION_TAGS.map((tag) => {
          const selected = selectedTags.includes(tag.key);
          return (
            <button
              key={tag.key}
              type="button"
              aria-pressed={selected}
              className={`${styles.tag} ${selected ? styles.tagSelected : ''}`}
              onClick={() => toggleTag(tag.key)}
            >
              {tag.label}
            </button>
          );
        })}
        {hasFilters && (
          <button type="button" className={styles.reset} onClick={resetFilters}>
            Wyczyść filtry
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : result.error ? (
        <div className={styles.state}>
          <p>{result.error}</p>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : result.items.length === 0 ? (
        <div className={styles.state}>
          <p>
            {hasFilters
              ? 'Żadna trasa nie pasuje do wybranych filtrów.'
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
          <div className={styles.grid}>
            {result.items.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>

          {result.hasMore && (
            <div className={styles.more}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={isLoadingMore}
                onClick={handleLoadMore}
              >
                {isLoadingMore ? 'Ładowanie…' : 'Pokaż więcej'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExplorePage;