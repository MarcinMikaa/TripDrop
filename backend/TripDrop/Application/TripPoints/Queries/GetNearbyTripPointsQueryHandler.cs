using MediatR;
using TripDrop.Application.TripPoints.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.TripPoints.Queries
{
    public class GetNearbyTripPointsQueryHandler : IRequestHandler<GetNearbyTripPointsQuery, IEnumerable<NearbyTripPointDto>>
    {
        private const int MaxLimit = 10;
        private const double MaxRadiusMeters = 50_000;

        private readonly ITripPointRepository _tripPointRepository;
        private readonly ITripRepository _tripRepository;

        public GetNearbyTripPointsQueryHandler(
            ITripPointRepository tripPointRepository,
            ITripRepository tripRepository)
        {
            _tripPointRepository = tripPointRepository;
            _tripRepository = tripRepository;
        }

        public async Task<IEnumerable<NearbyTripPointDto>> Handle(GetNearbyTripPointsQuery request, CancellationToken cancellationToken)
        {
            if (!double.IsFinite(request.Latitude) || !double.IsFinite(request.Longitude) ||
                request.Latitude is < -90 or > 90 || request.Longitude is < -180 or > 180)
                throw new ArgumentOutOfRangeException(nameof(request), "Nieprawidłowe współrzędne.");

            if (request.RadiusMeters is <= 0 or > MaxRadiusMeters)
                throw new ArgumentOutOfRangeException(nameof(request), "Nieprawidłowy promień wyszukiwania.");

            var trip = await _tripRepository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            var hasAccess = trip.OwnerId == request.CurrentUserId ||
                            trip.Participants.Any(p => p.UserId == request.CurrentUserId);

            if (!hasAccess)
                throw new UnauthorizedAccessException("Brak dostępu do tej wycieczki.");

            var nearby = await _tripPointRepository.GetNearestAsync(
                request.TripId,
                request.Latitude,
                request.Longitude,
                request.ExcludePointId,
                request.RadiusMeters,
                Math.Clamp(request.Limit, 1, MaxLimit),
                cancellationToken);

            return nearby.Select(p => new NearbyTripPointDto(
                p.Id,
                p.Name,
                p.DayIndex,
                p.DistanceMeters
            ));
        }
    }
}
