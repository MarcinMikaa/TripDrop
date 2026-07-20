using MediatR;

namespace TripDrop.Application.TripPoints.Commands
{
    public record UpdateTripPointCommand(
        Guid TripPointId,
        Guid CurrentUserId,
        string Name,
        int? DayIndex,
        int Position
    ) : IRequest<Unit>;
}
