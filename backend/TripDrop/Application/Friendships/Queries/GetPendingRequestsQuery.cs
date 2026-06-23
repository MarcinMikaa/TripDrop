using MediatR;
using TripDrop.Domain.Entities;

namespace TripDrop.Application.Friendships.Queries
{
    public record GetPendingRequestsQuery(Guid CurrentUserId) : IRequest<IEnumerable<Friendship>>;
}
