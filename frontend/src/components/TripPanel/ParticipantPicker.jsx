import { colorForUser } from '../../utils/useColor';
import styles from './TripPanel.module.scss';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className={`${styles.icon} ${styles.chipCheck}`}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className={`${styles.icon} ${styles.chipPlus}`}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ParticipantPicker = ({ friends, selectedIds, busyIds, onToggle, label = 'Znajomi', emptyText }) => {
  if (friends.length === 0) {
    return emptyText ? <p className={styles.pickerEmpty}>{emptyText}</p> : null;
  }

  return (
    <div className={styles.picker} role="group" aria-label={label}>
      {friends.map((friend) => {
        const selected = Boolean(selectedIds?.has(friend.id));
        const busy = Boolean(busyIds?.has(friend.id));
        const username = friend.username || 'nieznany';

        return (
          <button
            key={friend.id}
            type="button"
            aria-pressed={selected}
            disabled={busy}
            className={`${styles.chip} ${selected ? styles.chipOn : ''}`}
            onClick={() => onToggle(friend)}>
            <span className={styles.chipAvatar} style={{ background: colorForUser(friend.id) }} aria-hidden="true">
              {username.charAt(0).toUpperCase()}
            </span>
            @{username}
            {selected ? <CheckIcon /> : <PlusIcon />}
          </button>
        );
      })}
    </div>
  );
};

export default ParticipantPicker;
