using MediatR;
using TripDrop.Application.TripPoints.DTOs;

namespace TripDrop.Application.TripPoints.Commands
{
    public record CreateTripPointCommand(
        Guid TripId,
        Guid CurrentUserId,
        string Name,
        double Latitude,
        double Longitude,
        int? DayIndex
    ) : IRequest<TripPointDto>;
}
