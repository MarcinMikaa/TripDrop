import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { googleDayLinks, mapyDayLinks, TRAVEL_MODES } from '../../utils/tripExport';
import { useTravelMode } from '../../hooks/useTravelMode';
import { swalError, toastSuccess } from '../../utils/swal';
import Popover from './Popover';
import QrDialog from './QrDialog';
import styles from './TripExport.module.scss';

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

const rangeSuffix = (link, total) => (total > 1 ? ` · punkty ${link.from}-${link.to}` : '');

export const TravelModeSwitch = ({ mode, onChange }) => (
  <div className={styles.modes} role="radiogroup" aria-label="Środek transportu">
    {TRAVEL_MODES.map((option) => (
      <button
        key={option.key}
        type="button"
        role="radio"
        aria-checked={mode === option.key}
        className={`${styles.mode} ${mode === option.key ? styles.modeActive : ''}`}
        onClick={() => onChange(option.key)}>
        <FontAwesomeIcon icon={option.icon} aria-hidden="true" />
        <span>{option.label}</span>
      </button>
    ))}
  </div>
);

const DayExportMenu = ({ day, buttonClassName }) => {
  const [mode, setMode] = useTravelMode();
  const [qrOpen, setQrOpen] = useState(false);

  const googleLinks = useMemo(() => googleDayLinks(day.points, mode), [day.points, mode]);
  const mapyLinks = useMemo(() => mapyDayLinks(day.points, mode), [day.points, mode]);

  const touch = isTouchDevice();
  const canShare = touch && Boolean(navigator.share);

  const shareText = googleLinks
    .map((link) => (googleLinks.length > 1 ? `${day.label} (punkty ${link.from}-${link.to}): ${link.url}` : link.url))
    .join('\n');

  const handleShare = async () => {
    if (canShare) {
      try {
        await navigator.share({ title: day.label, text: shareText });
      } catch (err) {
        if (err.name !== 'AbortError') swalError('Nie udało się udostępnić', shareText);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toastSuccess('Skopiowano link do Google Maps.');
    } catch {
      swalError('Nie udało się skopiować', shareText);
    }
  };

  return (
    <>
      <Popover icon="diamond-turn-right" label={`Otwórz w mapach: ${day.label}`} buttonClassName={buttonClassName}>
        {(close) => (
          <>
            <TravelModeSwitch mode={mode} onChange={setMode} />

            <div className={styles.section}>
              <span className={styles.sectionTitle}>Otwórz trasę dnia</span>
              {googleLinks.map((link) => (
                <a
                  key={`g-${link.from}`}
                  className={styles.item}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => close()}>
                  <FontAwesomeIcon icon="map-location-dot" aria-hidden="true" />
                  <span>Google Maps{rangeSuffix(link, googleLinks.length)}</span>
                </a>
              ))}
            </div>

            <div className={styles.section}>
              <button
                type="button"
                className={styles.item}
                onClick={() => {
                  close();
                  handleShare();
                }}>
                <FontAwesomeIcon icon={canShare ? 'share-nodes' : 'copy'} aria-hidden="true" />
                <span>{canShare ? 'Udostępnij trasę dnia' : 'Kopiuj link Google Maps'}</span>
              </button>
              {!touch && (
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => {
                    close();
                    setQrOpen(true);
                  }}>
                  <FontAwesomeIcon icon="qrcode" aria-hidden="true" />
                  <span>Kod QR na telefon</span>
                </button>
              )}
            </div>
          </>
        )}
      </Popover>

      {qrOpen && <QrDialog title={day.label} links={googleLinks} onClose={() => setQrOpen(false)} />}
    </>
  );
};

export default DayExportMenu;
