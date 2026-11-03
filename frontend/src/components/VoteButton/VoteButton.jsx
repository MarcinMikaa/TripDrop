import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './VoteButton.module.scss';

const VoteButton = ({ count, voted, pending = false, onClick, size = 'md' }) => (
  <button
    type="button"
    className={`${styles.button} ${styles[size]} ${voted ? styles.voted : ''}`}
    aria-pressed={voted}
    aria-busy={pending}
    onClick={onClick}>
    <FontAwesomeIcon icon="fire" className={styles.icon} aria-hidden="true" />
    <span className={styles.count}>{count}</span>
  </button>
);

export default VoteButton;
