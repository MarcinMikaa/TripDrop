using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record DeleteTripCommand(Guid TripId, Guid CurrentUserId) : IRequest<Unit>;
}