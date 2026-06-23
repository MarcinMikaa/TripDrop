using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Friendships.Commands
{
    public class AcceptFriendRequestCommandHandler : IRequestHandler<AcceptFriendRequestCommand, Unit>
    {
        private readonly IFriendshipRepository _friendshipRepository;

        public AcceptFriendRequestCommandHandler(IFriendshipRepository friendshipRepository)
        {
            _friendshipRepository = friendshipRepository;
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

            return Unit.Value;
        }
    }
}
