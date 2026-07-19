using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record LeaveTripCommand(Guid TripId, Guid CurrentUserId) : IRequest<Unit>;
}
