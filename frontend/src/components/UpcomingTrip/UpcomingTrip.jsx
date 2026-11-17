import { Link } from 'react-router-dom';
import AvatarStack from '../AvatarStack/AvatarStack';
import TripBadges from '../TripBadges/TripBadges';
import TripThumbnail from '../TripThumbnail/TripThumbnail';
import { countDays, describeWhen, formatRange, getTiming, listDays, toDateInput } from '../TripPanel/tripForm';
import { dayColor } from '../../utils/dayColors';
import { pluralize, DAY_FORMS, PLACE_FORMS } from '../../utils/pluralize';
import { peopleCountLabel, peopleOf, roleLabel } from '../../utils/tripPeople';
import styles from './UpcomingTrip.module.scss';

const MAX_DAYS_SHOWN = 5;
const ARROW_ICON = 'M5 12h14M12 5l7 7-7 7';

const ticketDay = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', timeZone: 'UTC' });
const ticketMonth = new Intl.DateTimeFormat('pl-PL', { month: 'short', timeZone: 'UTC' });

const ArrowIcon = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={styles.icon} aria-hidden="true">
    <path d={ARROW_ICON} />
  </svg>
);

const TicketPart = ({ time, light = false }) => (
  <span className={`${styles.ticketPart} ${light ? styles.ticketPartLight : ''}`}>
    <span className={styles.ticketMonth}>{ticketMonth.format(new Date(time))}</span>
    <span className={styles.ticketDay}>{ticketDay.format(new Date(time))}</span>
  </span>
);

const Ticket = ({ timing }) => (
  <div className={styles.ticket} aria-hidden="true">
    <TicketPart time={timing.start} />
    {timing.end !== timing.start && (
      <>
        <span className={styles.ticketArrow}>
          <ArrowIcon size={16} />
        </span>
        <TicketPart time={timing.end} light />
      </>
    )}
  </div>
);

const DayBreakdown = ({ route, days }) => {
  const counts = Array.isArray(route.dayPointCounts) ? route.dayPointCounts : [];
  const shown = days.slice(0, MAX_DAYS_SHOWN);
  const hiddenDays = days.length - shown.length;
  const hiddenPoints = counts.slice(MAX_DAYS_SHOWN).reduce((sum, count) => sum + (count || 0), 0);
  const unassigned = route.unassignedPointCount || 0;

  return (
    <div className={styles.breakdown}>
      <ol className={styles.days} aria-label="Plan dni">
        {shown.map((day) => {
          const count = counts[day.index] || 0;
          return (
            <li key={day.index} className={styles.day}>
              <span className={styles.dayBadge} style={{ background: dayColor(day.index + 1) }}>
                {day.index + 1}
              </span>
              <span className={styles.dayLabel}>{day.label}</span>
              <span className={styles.dayLeader} aria-hidden="true" />
              <span className={`${styles.dayCount} ${count === 0 ? styles.dayCountEmpty : ''}`}>
                {count > 0 ? pluralize(count, PLACE_FORMS) : 'bez punktów'}
              </span>
            </li>
          );
        })}
      </ol>

      {(hiddenDays > 0 || unassigned > 0) && (
        <p className={styles.breakdownNote}>
          {hiddenDays > 0 && (
            <span>
              Pozostałe dni ({hiddenDays}): {pluralize(hiddenPoints, PLACE_FORMS)}
            </span>
          )}
          {unassigned > 0 && <span>Nieprzypisane do dnia: {pluralize(unassigned, PLACE_FORMS)}</span>}
        </p>
      )}
    </div>
  );
};

const PlanSummary = ({ trip, days }) => {
  const route = trip.route;

  if (route && route.pointCount > 0 && days.length > 0) return <DayBreakdown route={route} days={days} />;

  if (route && route.pointCount === 0) {
    return (
      <p className={styles.hint}>
        Plan jest jeszcze pusty. Dodaj pierwsze miejsca w{' '}
        <Link to={`/planner/${trip.id}`} className={styles.inlineLink}>
          planerze
        </Link>
        .
      </p>
    );
  }

  return trip.description ? <p className={styles.description}>{trip.description}</p> : null;
};

const UpcomingTrip = ({ trip, className = '' }) => {
  if (!trip) return null;

  const start = toDateInput(trip.startDate);
  const end = toDateInput(trip.endDate);
  const timing = getTiming(trip.startDate, trip.endDate);
  const dayTotal = countDays(start, end);
  const days = listDays(start, end);
  const pointCount = trip.route?.pointCount;

  return (
    <article className={`${styles.card} ${className}`}>
      <div className={styles.map}>
        <TripThumbnail trip={trip} />
        {timing.start !== null && <Ticket timing={timing} />}
      </div>

      <div className={styles.body}>
        <div className={styles.labels}>
          <span className={styles.eyebrow}>{timing.phase === 'ongoing' ? 'Trwa teraz' : 'Najbliższa wyprawa'}</span>
          {timing.phase === 'upcoming' && <span className={styles.countdown}>{describeWhen(start, end)}</span>}
          <TripBadges trip={trip} />
        </div>

        <div className={styles.heading}>
          <h2 className={styles.title}>
            <Link to={`/planner/${trip.id}`} className={styles.titleLink}>
              {trip.name}
            </Link>
          </h2>
          <p className={styles.meta}>
            <span>{formatRange(start, end) || 'Daty do ustalenia'}</span>
            {dayTotal > 0 && <span>{pluralize(dayTotal, DAY_FORMS)}</span>}
            {pointCount > 0 && <span>{pluralize(pointCount, PLACE_FORMS)}</span>}
            <span>{peopleCountLabel(trip)}</span>
          </p>
        </div>

        <PlanSummary trip={trip} days={days} />

        <div className={styles.footer}>
          <div className={styles.people}>
            <AvatarStack people={peopleOf(trip)} size="large" />
            <span className={styles.peopleLabel}>{roleLabel(trip)}</span>
          </div>
          <div className={styles.actions}>
            <Link to={`/trips/${trip.id}/manage`} className={styles.ghostBtn}>
              Zarządzaj
            </Link>
            <Link to={`/planner/${trip.id}`} className={styles.primaryBtn}>
              Otwórz planer
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default UpcomingTrip;
