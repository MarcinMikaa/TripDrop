import RouteSilhouette from '../RouteSilhouette/RouteSilhouette';
import MapSketch from './MapSketch';
import styles from './TripThumbnail.module.scss';

const TripThumbnail = ({ trip, className = '' }) => {
  const preview = trip.route?.preview;
  const hasPoints = Array.isArray(preview) && preview.length > 0;

  return (
    <div className={`${styles.root} ${className}`}>
      {hasPoints ? (
        <RouteSilhouette preview={preview} className={styles.silhouette} label={`Szkic trasy: ${trip.name}`} />
      ) : (
        <MapSketch seed={trip.id} />
      )}
    </div>
  );
};

export default TripThumbnail;
