using MediatR;
using TripDrop.Domain.Entities;

namespace TripDrop.Application.Friendships.Queries
{
    public record SearchUsersQuery(string SearchTerm, Guid CurrentUserId) : IRequest<IEnumerable<User>>;
}
