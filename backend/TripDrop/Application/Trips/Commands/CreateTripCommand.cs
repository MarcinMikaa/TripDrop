using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record CreateTripCommand(
        string Name,
        string? Description,
        DateTime? StartDate,
        DateTime? EndDate,
        Guid OwnerId,
        IEnumerable<Guid> ParticipantIds
    ) : IRequest<Guid>;
}