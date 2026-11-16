import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { pluralize, DAY_FORMS } from '../../utils/pluralize';
import { countDays, TRIP_DESCRIPTION_MAX, TRIP_NAME_MAX } from './tripForm';
import styles from './TripPanel.module.scss';

const TripDetailsFields = ({
  idPrefix,
  value,
  errors = {},
  onChange,
  datesLocked = false,
  datesHint,
  lockedHint = 'Plan jest zamknięty. Daty zmienisz po wznowieniu planowania w Ustawieniach.',
}) => {
  const days = countDays(value.startDate, value.endDate);
  const handleChange = (e) => onChange(e.target.name, e.target.value);

  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;
  const startId = `${idPrefix}-start`;
  const endId = `${idPrefix}-end`;
  const datesMessageId = `${idPrefix}-dates-message`;

  return (
    <div className={styles.fields}>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor={nameId} className={styles.label}>
            Nazwa wyprawy
          </label>
          <span className={styles.counter}>
            {value.name.length}/{TRIP_NAME_MAX}
          </span>
        </div>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="off"
          placeholder="np. Majówka 2027"
          maxLength={TRIP_NAME_MAX}
          value={value.name}
          onChange={handleChange}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
        />
        {errors.name && (
          <p id={`${nameId}-error`} className={styles.error}>
            {errors.name}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor={descriptionId} className={styles.label}>
            Opis
          </label>
          <span className={styles.counter}>opcjonalnie</span>
        </div>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          placeholder="Co planujecie? Krótka notatka dla uczestników."
          maxLength={TRIP_DESCRIPTION_MAX}
          value={value.description}
          onChange={handleChange}
          aria-invalid={Boolean(errors.description)}
          className={`${styles.input} ${styles.textarea} ${errors.description ? styles.inputError : ''}`}
        />
        {errors.description && <p className={styles.error}>{errors.description}</p>}
      </div>

      <fieldset className={styles.fieldset} aria-describedby={datesMessageId}>
        <legend className={styles.label}>Termin</legend>
        <div className={styles.dates}>
          <div className={styles.dateField}>
            <label htmlFor={startId} className={styles.subLabel}>
              Od
            </label>
            <input
              id={startId}
              name="startDate"
              type="date"
              value={value.startDate}
              onChange={handleChange}
              disabled={datesLocked}
              aria-invalid={Boolean(errors.dates)}
              className={`${styles.input} ${errors.dates ? styles.inputError : ''}`}
            />
          </div>
          <div className={styles.dateField}>
            <label htmlFor={endId} className={styles.subLabel}>
              Do
            </label>
            <input
              id={endId}
              name="endDate"
              type="date"
              min={value.startDate || undefined}
              value={value.endDate}
              onChange={handleChange}
              disabled={datesLocked}
              aria-invalid={Boolean(errors.dates)}
              className={`${styles.input} ${errors.dates ? styles.inputError : ''}`}
            />
          </div>
          <span className={styles.daysChip} aria-live="polite">
            {days > 0 ? pluralize(days, DAY_FORMS) : 'bez dat'}
          </span>
        </div>

        <div id={datesMessageId}>
          {errors.dates && <p className={styles.error}>{errors.dates}</p>}
          {!errors.dates && datesHint && !datesLocked && <p className={styles.hint}>{datesHint}</p>}
          {datesLocked && (
            <p className={styles.lockHint}>
              <FontAwesomeIcon icon="lock" />
              {lockedHint}
            </p>
          )}
        </div>
      </fieldset>
    </div>
  );
};

export default TripDetailsFields;
