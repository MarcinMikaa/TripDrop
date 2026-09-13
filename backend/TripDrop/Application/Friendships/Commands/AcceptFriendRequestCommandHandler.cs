using MediatR;
using TripDrop.Domain.Repositories;
using TripDrop.Application.Common;

namespace TripDrop.Application.Friendships.Commands
{
    public class AcceptFriendRequestCommandHandler : IRequestHandler<AcceptFriendRequestCommand, Unit>
    {
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IRealtimeNotifier _realtimeNotifier;

        public AcceptFriendRequestCommandHandler(
            IFriendshipRepository friendshipRepository,
            IRealtimeNotifier realtimeNotifier)
        {
            _friendshipRepository = friendshipRepository;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<Unit> Handle(AcceptFriendRequestCommand request, CancellationToken cancellationToken)
        {
            var friendship = await _friendshipRepository.GetByIdAsync(request.FriendshipId, cancellationToken);

            if (friendship is null)
                throw new InvalidOperationException("Zaproszenie nie istnieje");

            if (friendship.AddresseeId != request.CurrentUserId)
                throw new InvalidOperationException("Nie masz uprawnień do akceptacji tego zaproszenia");

            friendship.Accept();
            await _friendshipRepository.SaveChangesAsync(cancellationToken);

            await _realtimeNotifier.NotifyFriendRequestsChangedAsync(friendship.AddresseeId, cancellationToken);
            await _realtimeNotifier.NotifyFriendRequestsChangedAsync(friendship.RequesterId, cancellationToken);

            return Unit.Value;
        }
    }
}
