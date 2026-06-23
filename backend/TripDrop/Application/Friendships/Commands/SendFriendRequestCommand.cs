using MediatR;

namespace TripDrop.Application.Friendships.Commands
{
    public record SendFriendRequestCommand(Guid RequesterId, Guid AddresseeId): IRequest<Guid>;
}
