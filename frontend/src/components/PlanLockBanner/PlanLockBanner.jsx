import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './PlanLockBanner.module.scss';

const lockedAtFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatLockedAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : lockedAtFormat.format(date);
};

export default function PlanLockBanner({ lockedAt, ownerName, isOwner, onUnlock, isBusy = false }) {
  const when = formatLockedAt(lockedAt);
  const who = isOwner ? 'przez Ciebie' : ownerName ? `przez ${ownerName}` : null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.icon} aria-hidden="true">
        <FontAwesomeIcon icon="lock" />
      </span>

      <div className={styles.text}>
        <span className={styles.title}>
          Plan zamknięty{who && ` ${who}`}
          {when && <span className={styles.when}> - {when}</span>}
        </span>
        <span className={styles.hint}>Punkty i daty są tylko do odczytu. Eksport i nawigacja działają normalnie.</span>
      </div>

      {isOwner && (
        <button type="button" className={styles.unlockBtn} onClick={onUnlock} disabled={isBusy} aria-busy={isBusy}>
          <FontAwesomeIcon icon="lock-open" aria-hidden="true" />
          {isBusy ? 'Wznawianie...' : 'Wznów planowanie'}
        </button>
      )}
    </div>
  );
}
