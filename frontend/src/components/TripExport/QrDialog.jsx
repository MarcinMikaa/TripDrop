import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import styles from './TripExport.module.scss';

const QR_SIZE = 196;

const QrDialog = ({ title, links, onClose }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title">
        <h2 id="qr-dialog-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <p className={styles.dialogHint}>Zeskanuj aparatem telefonu, a trasa otworzy się w Google Maps.</p>

        <div className={styles.qrList}>
          {links.map((link) => (
            <figure key={link.url} className={styles.qr}>
              <QRCodeSVG value={link.url} size={QR_SIZE} level="M" />
              {links.length > 1 && (
                <figcaption>
                  Punkty {link.from}-{link.to}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        <div className={styles.dialogActions}>
          <button ref={closeRef} type="button" className={styles.secondaryBtn} onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default QrDialog;
