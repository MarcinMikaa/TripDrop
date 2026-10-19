import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { exploreService } from '../../services/ExploreService';
import { toastSuccess } from '../../utils/swal';
import { pluralize, DAY_FORMS } from '../../utils/pluralize';
import styles from './CopyTripDialog.module.scss';

const NAME_MAX = 200;

const rangeFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const parseInputDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const CopyTripDialog = ({ trip, onClose }) => {
  const navigate = useNavigate();
  const nameRef = useRef(null);

  const [name, setName] = useState(trip.title);
  const [startDate, setStartDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const range = useMemo(() => {
    const start = startDate ? parseInputDate(startDate) : null;
    if (!start) return null;
    if (trip.dayCount <= 1) return rangeFormatter.format(start);
    const end = new Date(start);
    end.setDate(end.getDate() + trip.dayCount - 1);
    return rangeFormatter.formatRange(start, end);
  }, [startDate, trip.dayCount]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && Boolean(range) && !isSaving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);
    try {
      const { tripId } = await exploreService.copyTrip(trip.id, { name: trimmedName, startDate });
      toastSuccess('Trasa skopiowana do Twoich wycieczek.');
      navigate(`/planner/${tripId}`);
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget && !isSaving) onClose();
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-trip-title"
        onSubmit={handleSubmit}>
        <h2 id="copy-trip-title" className={styles.title}>
          Skopiuj do moich wycieczek
        </h2>
        <p className={styles.hint}>
          Powstanie Twoja prywatna wycieczka ({pluralize(trip.dayCount, DAY_FORMS)}). Możesz ją dowolnie zmieniać, a
          późniejsze zmiany autora jej nie dotyczą.
        </p>

        <div className={styles.field}>
          <label htmlFor="copy-trip-name">Nazwa wycieczki</label>
          <input
            ref={nameRef}
            id="copy-trip-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="copy-trip-start">Data rozpoczęcia</label>
          <input id="copy-trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <p className={styles.range}>
            {range ? `Termin: ${range}` : 'Wybierz datę, a policzymy termin całej wycieczki.'}
          </p>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} disabled={isSaving} onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={!canSubmit}>
            {isSaving ? 'Kopiowanie…' : 'Skopiuj'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
};

export default CopyTripDialog;
