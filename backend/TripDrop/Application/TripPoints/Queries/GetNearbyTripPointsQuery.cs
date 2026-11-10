using MediatR;
using TripDrop.Application.TripPoints.DTOs;

namespace TripDrop.Application.TripPoints.Queries
{
    public record GetNearbyTripPointsQuery(
        Guid TripId,
        Guid CurrentUserId,
        double Latitude,
        double Longitude,
        Guid? ExcludePointId,
        double? RadiusMeters,
        int Limit
    ) : IRequest<IEnumerable<NearbyTripPointDto>>;
}
