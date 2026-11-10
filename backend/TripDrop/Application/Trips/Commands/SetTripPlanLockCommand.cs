using MediatR;
using TripDrop.Application.Trips.DTOs;

namespace TripDrop.Application.Trips.Commands
{
    public record SetTripPlanLockCommand(Guid TripId, Guid CurrentUserId, bool Locked) : IRequest<TripPlanLockDto>;
}
