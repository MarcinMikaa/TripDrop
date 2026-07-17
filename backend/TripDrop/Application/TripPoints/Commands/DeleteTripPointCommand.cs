using MediatR;

namespace TripDrop.Application.TripPoints.Commands
{
    public record DeleteTripPointCommand(Guid TripPointId, Guid CurrentUserId) : IRequest<Unit>;
}
