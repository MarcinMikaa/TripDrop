using MediatR;

namespace TripDrop.Application.TripPoints.Commands
{
    public record CreateTripPointCommand(
        Guid TripId,
        Guid CurrentUserId,
        string Name,
        double Latitude,
        double Longitude,
        int? DayIndex
    ) : IRequest<Guid>;
}
