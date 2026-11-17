import { Link } from 'react-router-dom';
import RouteSilhouette from '../RouteSilhouette/RouteSilhouette';
import { pluralize, DAY_FORMS } from '../../utils/pluralize';
import { PublishedTripCopies, PublishedTripMeta, PublishedTripTags, PublishedTripVotes } from './PublishedTripParts';
import styles from './PublishedTrip.module.scss';

const PublishedTripCard = ({ trip, votePending = false, onVote, compact = false, className = '' }) => (
  <article className={`${styles.card} ${compact ? styles.cardCompact : ''} ${className}`}>
    <div className={styles.map}>
      <RouteSilhouette preview={trip.preview} className={styles.silhouette} label={`Szkic trasy: ${trip.title}`} />
      <span className={styles.daysChip}>{pluralize(trip.dayCount ?? 0, DAY_FORMS)}</span>
    </div>

    <div className={styles.body}>
      {!compact && trip.region && <span className={styles.region}>{trip.region}</span>}

      <div className={compact ? styles.titleRow : undefined}>
        <h3 className={styles.title}>
          <Link to={`/explore/${trip.id}`} className={styles.link}>
            {trip.title}
          </Link>
        </h3>
        {compact && <PublishedTripVotes trip={trip} pending={votePending} onVote={onVote} size="sm" />}
      </div>

      <PublishedTripMeta trip={trip} />
      <PublishedTripTags tags={trip.tags} />

      {!compact && (
        <div className={styles.footer}>
          <PublishedTripCopies count={trip.copyCount} />
          <PublishedTripVotes trip={trip} pending={votePending} onVote={onVote} size="sm" />
        </div>
      )}
    </div>
  </article>
);

export default PublishedTripCard;
