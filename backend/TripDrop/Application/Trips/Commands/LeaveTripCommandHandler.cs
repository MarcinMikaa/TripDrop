using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class LeaveTripCommandHandler : IRequestHandler<LeaveTripCommand, Unit>
    {
        private readonly ITripRepository _repository;
        public LeaveTripCommandHandler(ITripRepository repository) => _repository = repository;

        public async Task<Unit> Handle(LeaveTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken);
            if (trip is null) throw new InvalidOperationException("Wycieczka nie istnieje.");
            if (trip.OwnerId == request.CurrentUserId)
                throw new InvalidOperationException("Organizator nie może opuścić własnej wycieczki. Możesz ją usunąć.");

            var participant = trip.Participants.FirstOrDefault(p => p.UserId == request.CurrentUserId);
            if (participant is null) throw new InvalidOperationException("Nie jesteś uczestnikiem tej wycieczki.");

            trip.Participants.Remove(participant);
            await _repository.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
