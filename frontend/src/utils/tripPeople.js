import { pluralize } from './pluralize';

const PEOPLE_FORMS = { one: 'osoba', few: 'osoby', many: 'osób', other: 'osoby' };

export const peopleOf = (trip) => [
  { id: trip.ownerId, username: trip.ownerUsername || 'organizator' },
  ...(trip.participants ?? []).filter((person) => person.id !== trip.ownerId),
];

export const peopleCountLabel = (trip) => pluralize(peopleOf(trip).length, PEOPLE_FORMS);

export const roleLabel = (trip) => {
  if (!trip.isOwner) return `Organizuje @${trip.ownerUsername}`;
  const others = (trip.participants ?? []).filter((person) => person.id !== trip.ownerId);
  if (others.length === 0) return 'Tylko Ty';
  if (others.length === 1) return `Ty i @${others[0].username}`;
  return `Ty i ${pluralize(others.length, PEOPLE_FORMS)}`;
};
