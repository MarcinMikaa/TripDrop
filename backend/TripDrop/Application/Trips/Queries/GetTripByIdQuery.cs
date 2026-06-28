using MediatR;
using TripDrop.Application.Trips.DTOs;

namespace TripDrop.Application.Trips.Queries
{
    public record GetTripByIdQuery(Guid TripId, Guid CurrentUserId) : IRequest<TripDto?>;
}