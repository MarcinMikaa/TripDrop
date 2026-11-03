import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { googleNavigateLink } from '../../utils/tripExport';
import { useTravelMode } from '../../hooks/useTravelMode';
import styles from './TripExport.module.scss';

const NavigateLink = ({ lat, lng }) => {
  const [mode] = useTravelMode();
  return (
    <a
      className={styles.navLink}
      href={googleNavigateLink({ lat, lng }, mode)}
      target="_blank"
      rel="noopener noreferrer">
      <FontAwesomeIcon icon="diamond-turn-right" aria-hidden="true" /> Nawiguj tutaj
    </a>
  );
};

export default NavigateLink;
