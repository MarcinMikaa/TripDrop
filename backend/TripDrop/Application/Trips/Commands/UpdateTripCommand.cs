using MediatR;

namespace TripDrop.Application.Trips.Commands
{
    public record UpdateTripCommand(
        Guid TripId, Guid CurrentUserId, 
        string Name, string? Description,
        DateTime? StartDate, DateTime? EndDate
        ) : IRequest<Unit>;
}
