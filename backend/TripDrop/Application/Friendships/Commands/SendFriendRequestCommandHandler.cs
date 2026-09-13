using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;
using TripDrop.Application.Common;

namespace TripDrop.Application.Friendships.Commands
{
    public class SendFriendRequestCommandHandler : IRequestHandler<SendFriendRequestCommand, Guid>
    {
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
        private readonly IRealtimeNotifier _realtimeNotifier;

        public SendFriendRequestCommandHandler(
            IFriendshipRepository friendshipRepository,
            IUserRepository userRepository,
            IRealtimeNotifier realtimeNotifier)
        {
            _friendshipRepository = friendshipRepository;
            _userRepository = userRepository;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<Guid> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken)
        {
            if (request.RequesterId == request.AddresseeId)
                throw new InvalidOperationException("Nie możesz wysłać zaproszenia do samego siebie.");

            var addressee = await _userRepository.GetByIdAsync(request.AddresseeId, cancellationToken);
            if (addressee is null)
                throw new InvalidOperationException("Użytkownik nie istnieje.");

            var existing = await _friendshipRepository.GetBetweenUserAsync(
                request.RequesterId, request.AddresseeId, cancellationToken);

            if (existing is not null)
                throw new InvalidOperationException("Zaproszenie już istnieje lub jesteście już znajomymi.");

            var friendship = new Friendship(request.RequesterId, request.AddresseeId);
            await _friendshipRepository.AddAsync(friendship, cancellationToken);
            await _friendshipRepository.SaveChangesAsync(cancellationToken);
            await _realtimeNotifier.NotifyFriendRequestsChangedAsync(request.AddresseeId, cancellationToken);

            return friendship.Id;
        }
    }
}
