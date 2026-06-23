using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Friendships.Queries
{
    public class GetPendingRequestsQueryHandler : IRequestHandler<GetPendingRequestsQuery, IEnumerable<Friendship>>
    {
        private readonly IFriendshipRepository _friendshipRepository;

        public GetPendingRequestsQueryHandler(IFriendshipRepository friendshipRepository)
        {
            _friendshipRepository = friendshipRepository;
        }

        public async Task<IEnumerable<Friendship>> Handle(GetPendingRequestsQuery request, CancellationToken cancellationToken)
        {
            return await _friendshipRepository.GetPendingForUserAsync(request.CurrentUserId, cancellationToken);
        }
    }
}
