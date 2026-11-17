import { colorForUser } from '../../utils/useColor';
import styles from './AvatarStack.module.scss';

const DEFAULT_MAX = 4;

const initialOf = (username) => (username || '?').trim().charAt(0).toUpperCase() || '?';

const AvatarStack = ({ people, max = DEFAULT_MAX, size = 'small', className = '' }) => {
  const list = Array.isArray(people) ? people : [];
  const shown = list.slice(0, Math.max(1, max));
  const extra = list.length - shown.length;

  if (list.length === 0) return null;

  return (
    <div
      className={`${styles.stack} ${size === 'large' ? styles.large : ''} ${className}`}
      role="img"
      aria-label={`Uczestnicy: ${list.map((person) => `@${person.username}`).join(', ')}`}>
      {shown.map((person) => (
        <span key={person.id} className={styles.avatar} style={{ background: colorForUser(person.id) }}>
          {initialOf(person.username)}
        </span>
      ))}
      {extra > 0 && <span className={`${styles.avatar} ${styles.more}`}>+{extra}</span>}
    </div>
  );
};

export default AvatarStack;
