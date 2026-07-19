using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record RemoveTripParticipantCommand(Guid TripId, Guid ParticipantUserId, Guid CurrentUserId) : IRequest<Unit>;
}
