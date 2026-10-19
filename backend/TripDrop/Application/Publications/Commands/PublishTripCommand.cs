using MediatR;
using TripDrop.Application.Publications.Dto;

namespace TripDrop.Application.Publications.Commands
{
    public record PublishTripCommand(
        Guid TripId,
        Guid UserId,
        IReadOnlyCollection<Guid>? PointIds,
        string? Title,
        string? Description,
        string? Region,
        IReadOnlyCollection<string>? Tags,
        string? Visibility) : IRequest<TripPublicationDto>;
}
