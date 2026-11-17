import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { PUBLICATION_TAG_LABELS } from '../../utils/publicationTags';
import { pluralize, PLACE_FORMS } from '../../utils/pluralize';
import { formatDistance } from '../../utils/routeFormat';
import VoteButton from '../VoteButton/VoteButton';
import styles from './PublishedTrip.module.scss';

const MAX_TAGS = 3;

const copiesLabel = (count) => {
  if (!count) return 'jeszcze nie kopiowana';
  return `skopiowano ${count} ${count === 1 ? 'raz' : 'razy'}`;
};

export const PublishedTripMeta = ({ trip, large = false }) => {
  const items = [
    pluralize(trip.pointCount ?? 0, PLACE_FORMS),
    trip.totalDistanceM != null ? formatDistance(trip.totalDistanceM) : null,
    trip.author ? `@${trip.author}` : null,
  ].filter(Boolean);

  return (
    <p className={`${styles.meta} ${large ? styles.metaLarge : ''}`}>
      {items.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </p>
  );
};

export const PublishedTripTags = ({ tags, max = MAX_TAGS }) => {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const extra = tags.length - max;

  return (
    <div className={styles.tagList}>
      {tags.slice(0, max).map((key) => (
        <span key={key} className={styles.tagChip}>
          {PUBLICATION_TAG_LABELS[key] ?? key}
        </span>
      ))}
      {extra > 0 && <span className={styles.tagChip}>+{extra}</span>}
    </div>
  );
};

export const PublishedTripCopies = ({ count }) => (
  <span className={styles.copies}>
    <FontAwesomeIcon icon="copy" aria-hidden="true" />
    {copiesLabel(count)}
  </span>
);

export const PublishedTripVotes = ({ trip, pending = false, onVote, size = 'md' }) => {
  const count = trip.voteCount ?? 0;

  if (!onVote) {
    return (
      <span className={styles.voteStatic} aria-label={`Głosy: ${count}`}>
        <FontAwesomeIcon icon="fire" aria-hidden="true" />
        {count}
      </span>
    );
  }

  return (
    <span className={styles.voteSlot}>
      <VoteButton
        count={count}
        voted={Boolean(trip.hasVoted)}
        pending={pending}
        size={size}
        onClick={() => onVote(trip)}
      />
    </span>
  );
};
