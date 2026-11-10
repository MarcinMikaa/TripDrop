using MediatR;
using TripDrop.Application.Explore.Dto;

namespace TripDrop.Application.Explore.Commands
{
    public record SetPublicationVoteCommand(Guid PublicationId, Guid UserId, bool Voted)
        : IRequest<PublicationVoteDto>;
}
