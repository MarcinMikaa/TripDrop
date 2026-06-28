using MediatR;
using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Queries
{
    public class GetTripByIdQueryHandler : IRequestHandler<GetTripByIdQuery, TripDto?>
    {
        private readonly ITripRepository _repository;

        public GetTripByIdQueryHandler(ITripRepository repository)
        {
            _repository = repository;
        }

        public async Task<TripDto?> Handle(GetTripByIdQuery request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                return null;

            var isOwnerOrParticipant = trip.OwnerId == request.CurrentUserId ||
                trip.Participants.Any(p => p.UserId == request.CurrentUserId);

            if (!isOwnerOrParticipant)
                throw new UnauthorizedAccessException("Brak dostępu do tej wycieczki.");

            return new TripDto(
                trip.Id,
                trip.Name,
                trip.Description,
                trip.StartDate,
                trip.EndDate,
                trip.CreatedAt,
                IsOwner: trip.OwnerId == request.CurrentUserId,
                ParticipantCount: trip.Participants.Count,
                Participants: trip.Participants.Select(p => new TripParticipantDto(p.User.Id, p.User.Username))
            );
        }
    }
}