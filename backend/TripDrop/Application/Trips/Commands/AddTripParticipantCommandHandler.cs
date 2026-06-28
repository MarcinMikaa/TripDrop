using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class AddTripParticipantCommandHandler : IRequestHandler<AddTripParticipantCommand, Unit>
    {
        private readonly ITripRepository _tripRepository;
        private readonly IUserRepository _userRepository;

        public AddTripParticipantCommandHandler(ITripRepository tripRepository, IUserRepository userRepository)
        {
            _tripRepository = tripRepository;
            _userRepository = userRepository;
        }

        public async Task<Unit> Handle(AddTripParticipantCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            if (trip.OwnerId != request.CurrentUserId)
                throw new UnauthorizedAccessException("Tylko właściciel może dodawać uczestników.");

            var alreadyParticipant = trip.Participants.Any(p => p.UserId == request.UserId);
            if (alreadyParticipant)
                throw new InvalidOperationException("Ten użytkownik jest już uczestnikiem wycieczki.");

            if (request.UserId == request.CurrentUserId)
                throw new InvalidOperationException("Nie możesz dodać siebie jako uczestnika.");

            var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
            if (user is null)
                throw new InvalidOperationException("Użytkownik nie istnieje.");

            trip.Participants.Add(new TripParticipant(trip.Id, request.UserId));
            await _tripRepository.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}