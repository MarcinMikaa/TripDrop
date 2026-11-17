import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { exploreService } from '../../services/ExploreService';
import { usePublicationVotes } from '../../hooks/usePublicationVotes';
import PublishedTripCard from '../PublishedTrip/PublishedTripCard';
import styles from './CommunityTrips.module.scss';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 8;
const DEFAULT_TITLE = 'Trasy, które ktoś już sprawdził';

const clampLimit = (value) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return DEFAULT_LIMIT;
  return Math.min(number, MAX_LIMIT);
};

const CommunityTrips = ({ limit = DEFAULT_LIMIT, sort = 'hot', title = DEFAULT_TITLE, className = '' }) => {
  const headingId = useId();
  const take = clampLimit(limit);
  const requestKey = `${sort}|${take}`;
  const [result, setResult] = useState({ key: null, items: [], failed: false });

  useEffect(() => {
    const key = `${sort}|${take}`;
    const controller = new AbortController();

    exploreService
      .getTrips({ search: '', tags: [], sort, skip: 0, take }, { signal: controller.signal })
      .then((page) => {
        const items = Array.isArray(page?.items) ? page.items.slice(0, take) : [];
        setResult({ key, items, failed: false });
      })
      .catch((err) => {
        if (err?.canceled || controller.signal.aborted) return;
        setResult({ key, items: [], failed: true });
      });

    return () => controller.abort();
  }, [sort, take]);

  const updateItem = (tripId, changes) =>
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === tripId ? { ...item, ...changes } : item)),
    }));

  const { pendingVotes, toggleVote } = usePublicationVotes(updateItem);

  const isLoading = result.key !== requestKey;
  if (!isLoading && (result.failed || result.items.length === 0)) return null;

  const exploreLink = sort ? `/explore?sort=${encodeURIComponent(sort)}` : '/explore';

  return (
    <section className={`${styles.section} ${className}`} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          <Link to={exploreLink} className={styles.allLink}>
            Zobacz wszystkie
            <svg viewBox="0 0 24 24" width="18" height="18" className={styles.icon} aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <div className={styles.grid} aria-busy="true" aria-label="Wczytywanie tras">
            {Array.from({ length: take }, (_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {result.items.map((trip) => (
              <PublishedTripCard
                key={trip.id}
                trip={trip}
                compact
                votePending={pendingVotes.has(trip.id)}
                onVote={toggleVote}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityTrips;
