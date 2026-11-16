import { colorForUser } from '../../utils/useColor';
import { pluralize, PLACE_FORMS } from '../../utils/pluralize';
import { describeWhen, formatRange } from './tripForm';
import styles from './TripPanel.module.scss';

const MAX_AVATARS = 4;
const PEOPLE_FORMS = { one: 'osoba', few: 'osoby', many: 'osób', other: 'osoby' };
const DOTS = [
  [60, 112],
  [104, 96],
  [150, 120],
  [186, 76],
  [232, 60],
  [250, 104],
];

const TripPreviewCard = ({
  name,
  startDate,
  endDate,
  people = [],
  pointCount = null,
  label = 'Tak wygląda na liście',
}) => {
  const title = name.trim();
  const range = formatRange(startDate, endDate);
  const visiblePeople = people.slice(0, MAX_AVATARS);
  const hiddenPeople = people.length - visiblePeople.length;
  const dots = pointCount ? DOTS.slice(0, Math.min(pointCount, DOTS.length)) : [];

  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>{label}</span>
      <div className={styles.previewCard} aria-hidden="true">
        <div className={styles.previewMap}>
          <svg viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="160" className={styles.previewGround} />
            <path className={styles.previewPark} d="M178 96c18-14 52-10 62 10s-8 40-34 42-44-12-42-28 4-16 14-24z" />
            <path className={styles.previewContour} d="M160 50c24-24 74-22 92 6s-6 58-42 62-70-12-66-36 0-20 16-32z" />
            <path
              className={styles.previewContour}
              d="M140 42c34-36 106-34 126 8s-8 82-60 86-96-16-94-52 4-26 28-42z"
            />
            <path className={styles.previewRoad} d="M-10 120 C70 100 120 140 190 110 S280 80 310 86" />
            {dots.map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" className={styles.previewDot} />
            ))}
          </svg>
          {pointCount === 0 && <span className={styles.previewEmpty}>Punkty dodasz w planerze</span>}
          {range && <span className={styles.previewRange}>{range}</span>}
        </div>

        <div className={styles.previewBody}>
          <span className={styles.previewWhen}>{describeWhen(startDate, endDate)}</span>
          <span className={`${styles.previewTitle} ${title ? '' : styles.previewTitleEmpty}`}>
            {title || 'Nazwa wyprawy'}
          </span>
          {pointCount > 0 && <span className={styles.previewMeta}>{pluralize(pointCount, PLACE_FORMS)}</span>}

          {people.length > 0 && (
            <div className={styles.previewPeople}>
              <div className={styles.avatarStack}>
                {visiblePeople.map((person) => (
                  <span key={person.id} className={styles.avatarSmall} style={{ background: colorForUser(person.id) }}>
                    {(person.username || '?').charAt(0).toUpperCase()}
                  </span>
                ))}
                {hiddenPeople > 0 && (
                  <span className={`${styles.avatarSmall} ${styles.avatarMore}`}>+{hiddenPeople}</span>
                )}
              </div>
              <span className={styles.previewMeta}>
                {people.length === 1 ? 'Tylko Ty' : pluralize(people.length, PEOPLE_FORMS)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPreviewCard;
