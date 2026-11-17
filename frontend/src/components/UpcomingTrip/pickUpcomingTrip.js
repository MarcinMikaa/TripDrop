import { getTiming } from '../TripPanel/tripForm';

const PHASE_RANK = { ongoing: 0, upcoming: 1 };

const isEarlier = (candidate, current) => {
  const byPhase = PHASE_RANK[candidate.phase] - PHASE_RANK[current.phase];
  if (byPhase !== 0) return byPhase < 0;
  return candidate.start < current.start;
};

export const pickUpcomingTrip = (trips) => {
  if (!Array.isArray(trips)) return null;

  let best = null;
  trips.forEach((trip) => {
    if (!trip) return;
    const timing = getTiming(trip.startDate, trip.endDate);
    if (!(timing.phase in PHASE_RANK)) return;
    if (!best || isEarlier(timing, best.timing)) best = { trip, timing };
  });

  return best?.trip ?? null;
};
