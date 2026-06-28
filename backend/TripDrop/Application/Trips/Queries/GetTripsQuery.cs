using MediatR;
using TripDrop.Application.Trips.DTOs;

namespace TripDrop.Application.Trips.Queries
{
    public record GetTripsQuery(Guid CurrentUserId) : IRequest<IEnumerable<TripDto>>;
}