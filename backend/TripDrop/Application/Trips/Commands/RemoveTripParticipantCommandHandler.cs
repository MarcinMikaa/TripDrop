using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class RemoveTripParticipantCommandHandler : IRequestHandler<RemoveTripParticipantCommand, Unit>
    {
        private readonly ITripRepository _repository;
        public RemoveTripParticipantCommandHandler(ITripRepository repository) => _repository = repository;

        public async Task<Unit> Handle(RemoveTripParticipantCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken);
            if (trip is null) throw new InvalidOperationException("Wycieczka nie istnieje.");
            if (trip.OwnerId != request.CurrentUserId) throw new UnauthorizedAccessException("Tylko właściciel może usuwać uczestników.");

            var participant = trip.Participants.FirstOrDefault(p => p.UserId == request.ParticipantUserId);
            if (participant is null) throw new InvalidOperationException("Ten użytkownik nie jest uczestnikiem.");

            trip.Participants.Remove(participant);
            await _repository.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
