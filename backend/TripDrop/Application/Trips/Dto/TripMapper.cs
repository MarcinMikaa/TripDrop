using TripDrop.Domain.Entities;

namespace TripDrop.Application.Trips.DTOs
{
    public static class TripMapper
    {
        public static TripDto ToDto(Trip trip, Guid currentUserId)
        {
            if (trip.Owner is null)
                throw new InvalidOperationException("Trip.Owner nie został załadowany. Brakuje Include(t => t.Owner).");

            return new TripDto(
                Id: trip.Id,
                Name: trip.Name,
                Description: trip.Description,
                StartDate: trip.StartDate,
                EndDate: trip.EndDate,
                CreatedAt: trip.CreatedAt,
                IsOwner: trip.OwnerId == currentUserId,
                OwnerId: trip.OwnerId,
                OwnerUsername: trip.Owner.Username,
                ParticipantCount: trip.Participants.Count,
                Participants: trip.Participants
                    .Select(p => new TripParticipantDto(p.User.Id, p.User.Username))
                    .ToList(),
                PlanLockedAt: trip.PlanLockedAt);
        }
    }
}
