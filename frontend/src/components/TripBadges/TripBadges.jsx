import styles from './TripBadges.module.scss';

const ICONS = {
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
};

const BadgeIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="13" height="13" className={styles.icon} aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const TripBadges = ({ trip, compact = false }) => {
  const isPublic = trip.publicationVisibility === 'public';
  const badgeClass = `${styles.badge} ${compact ? styles.compact : ''}`;

  return (
    <>
      {trip.planLockedAt && (
        <span className={`${badgeClass} ${styles.locked}`}>
          <BadgeIcon name="lock" />
          Plan zamknięty
        </span>
      )}
      {trip.publicationVisibility && (
        <span className={`${badgeClass} ${styles.published}`}>
          <BadgeIcon name={isPublic ? 'globe' : 'link'} />
          {isPublic ? 'Opublikowana' : 'Przez link'}
        </span>
      )}
    </>
  );
};

export default TripBadges;
