using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Friendships.Queries
{
    public class GetFriendsQueryHandler : IRequestHandler<GetFriendsQuery, IEnumerable<Friendship>>
    {
        private readonly IFriendshipRepository _friendshipRepository;

        public GetFriendsQueryHandler(IFriendshipRepository friendshipRepository)
        {
            _friendshipRepository = friendshipRepository;
        }

        public async Task<IEnumerable<Friendship>> Handle(GetFriendsQuery request, CancellationToken cancellationToken)
        {
            return await _friendshipRepository.GetAcceptedForUserAsync(request.CurrentUserId, cancellationToken);
        }
    }
}
