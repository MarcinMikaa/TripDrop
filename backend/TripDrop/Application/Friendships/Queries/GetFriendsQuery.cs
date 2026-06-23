using MediatR;
using TripDrop.Domain.Entities;

namespace TripDrop.Application.Friendships.Queries
{
    public record GetFriendsQuery(Guid CurrentUserId) : IRequest<IEnumerable<Friendship>>;
}
