using MediatR;
using TripDrop.Application.TripPoints.DTOs;

namespace TripDrop.Application.TripPoints.Queries
{
    public record GetTripPointsByTripQuery(Guid TripId, Guid CurrentUserId) : IRequest<IEnumerable<TripPointDto>>;
}
