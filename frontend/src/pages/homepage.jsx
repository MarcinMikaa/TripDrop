import { Link } from 'react-router-dom';
import styles from './HomePage.module.scss';


export default function HomePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>TripDrop</h1>
      <p className={styles.subtitle}>
        Narzędzie do grupowego planowania wycieczek w czasie rzeczywistym.
      </p>

      <div className={styles.actions}>
        <Link to="/trips"   className={styles.btnPrimary}>Zobacz wycieczki</Link>
        <Link to="/planner" className={styles.btnSecondary}>Otwórz planer</Link>
      </div>
    </div>
        )
};
