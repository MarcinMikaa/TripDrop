using MediatR;

namespace TripDrop.Application.Explore.Commands
{
    public record CopyPublishedTripCommand(
        Guid PublicationId,
        Guid UserId,
        string? Name,
        DateTime? StartDate) : IRequest<Guid>;
}
