using MediatR;
using TripDrop.Application.TripPoints.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.TripPoints.Queries
{
    public class GetTripPointsByTripQueryHandler : IRequestHandler<GetTripPointsByTripQuery, IEnumerable<TripPointDto>>
    {
        private readonly ITripPointRepository _tripPointRepository;
        private readonly ITripRepository _tripRepository;

        public GetTripPointsByTripQueryHandler(
            ITripPointRepository tripPointRepository,
            ITripRepository tripRepository)
        {
            _tripPointRepository = tripPointRepository;
            _tripRepository = tripRepository;
        }

        public async Task<IEnumerable<TripPointDto>> Handle(GetTripPointsByTripQuery request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            var hasAccess = trip.OwnerId == request.CurrentUserId ||
                            trip.Participants.Any(p => p.UserId == request.CurrentUserId);

            if (!hasAccess)
                throw new UnauthorizedAccessException("Brak dostępu do tej wycieczki.");

            var points = await _tripPointRepository.GetByTripIdAsync(request.TripId, cancellationToken);

            return points.Select(p => new TripPointDto(
                p.Id,
                p.TripId,
                p.UserId,
                p.User?.Username, 
                p.Name,
                p.Latitude,
                p.Longitude,
                p.DayIndex,
                p.Position,
                p.CreatedAt,
                p.UpdatedAt
            ));
        }
    }
}
