using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TripDrop.Application.Friendships.Commands
{
    public record AcceptFriendRequestCommand(Guid FriendshipId, Guid CurrentUserId) : IRequest<Unit>;
}
