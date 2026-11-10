import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  buildGpx,
  buildKml,
  downloadFile,
  fileSafeName,
  GPX_MIME,
  KML_MIME,
  UNASSIGNED_LABEL,
} from '../../utils/tripExport';
import { toastError } from '../../utils/swal';
import Popover from './Popover';
import styles from './TripExport.module.scss';

const FORMATS = {
  kml: { build: buildKml, extension: 'kml', mime: KML_MIME },
  gpx: { build: buildGpx, extension: 'gpx', mime: GPX_MIME },
};

const TripExportMenu = ({ trip, buttonClassName }) => {
  const unassignedCount = trip.unassigned?.length ?? 0;
  const hasPoints = unassignedCount > 0 || trip.days.some((day) => day.points.length > 0);

  const exportAs = (key) => {
    const format = FORMATS[key];
    try {
      downloadFile(format.build(trip), `${fileSafeName(trip.title)}.${format.extension}`, format.mime);
    } catch (err) {
      console.error('[eksport] Nie udało się przygotować pliku:', err);
      toastError('Nie udało się przygotować pliku.');
    }
  };

  return (
    <Popover
      icon="file-export"
      text="Eksportuj"
      label={hasPoints ? 'Eksportuj wycieczkę' : 'Brak punktów do eksportu'}
      buttonClassName={buttonClassName}
      width={290}
      disabled={!hasPoints}>
      {(close) => (
        <>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Cała wycieczka do pliku</span>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                close();
                exportAs('kml');
              }}>
              <FontAwesomeIcon icon="map" aria-hidden="true" />
              <span className={styles.itemText}>
                Google Moje Mapy
                <small>plik KML, każdy dzień jako osobny folder</small>
              </span>
            </button>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                close();
                exportAs('gpx');
              }}>
              <FontAwesomeIcon icon="route" aria-hidden="true" />
              <span className={styles.itemText}>
                GPX
                <small>Mapy.com, OsmAnd, Komoot, Garmin</small>
              </span>
            </button>
          </div>

          <details className={styles.help}>
            <summary>Jak dodać do Google Moich Map?</summary>
            <ol>
              <li>Pobierz plik KML.</li>
              <li>
                Otwórz{' '}
                <a href="https://www.google.com/mymaps" target="_blank" rel="noopener noreferrer">
                  Moje Mapy Google
                </a>{' '}
                i utwórz nową mapę.
              </li>
              <li>W warstwie kliknij „Importuj” i wybierz pobrany plik.</li>
            </ol>
          </details>

          {unassignedCount > 0 && (
            <p className={styles.note}>
              Punkty nieprzypisane ({unassignedCount}) trafią do folderu „{UNASSIGNED_LABEL}”.
            </p>
          )}
        </>
      )}
    </Popover>
  );
};

export default TripExportMenu;
