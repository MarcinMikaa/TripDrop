using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record AddTripParticipantCommand(Guid TripId, Guid UserId, Guid CurrentUserId) : IRequest<Unit>;
}