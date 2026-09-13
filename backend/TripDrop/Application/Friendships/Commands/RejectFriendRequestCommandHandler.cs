using MediatR;
using TripDrop.Domain.Repositories;
using TripDrop.Application.Common;

namespace TripDrop.Application.Friendships.Commands
{
    public class RejectFriendRequestCommandHandler : IRequestHandler<RejectFriendRequestCommand, Unit>
    {
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IRealtimeNotifier _realtimeNotifier;

        public RejectFriendRequestCommandHandler(
            IFriendshipRepository friendshipRepository,
            IRealtimeNotifier realtimeNotifier)
        {
            _friendshipRepository = friendshipRepository;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<Unit> Handle(RejectFriendRequestCommand request, CancellationToken cancellationToken)
        {
            var friendship = await _friendshipRepository.GetByIdAsync(request.FriendshipId, cancellationToken);

            if (friendship is null)
                throw new InvalidOperationException("Zaproszenie nie istnieje.");

            if (friendship.AddresseeId != request.CurrentUserId)
                throw new InvalidOperationException("Nie masz uprawnień do odrzucenia tego zaproszenia.");

            friendship.Reject();
            await _friendshipRepository.SaveChangesAsync(cancellationToken);
            await _realtimeNotifier.NotifyFriendRequestsChangedAsync(friendship.AddresseeId, cancellationToken);

            return Unit.Value;
        }
    }
}
