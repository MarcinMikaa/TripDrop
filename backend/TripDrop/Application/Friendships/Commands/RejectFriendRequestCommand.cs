
using MediatR;

namespace TripDrop.Application.Friendships.Commands
{
    public record RejectFriendRequestCommand(Guid FriendshipId, Guid CurrentUserId) : IRequest<Unit>;
}
