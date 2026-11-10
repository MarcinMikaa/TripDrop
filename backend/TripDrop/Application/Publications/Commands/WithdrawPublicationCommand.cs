using MediatR;
using TripDrop.Application.Publications.Dto;

namespace TripDrop.Application.Publications.Commands
{
    public record WithdrawPublicationCommand(Guid TripId, Guid UserId) : IRequest<TripPublicationDto>;
}
