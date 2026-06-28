using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class DeleteTripCommandHandler : IRequestHandler<DeleteTripCommand, Unit>
    {
        private readonly ITripRepository _repository;

        public DeleteTripCommandHandler(ITripRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(DeleteTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            if (trip.OwnerId != request.CurrentUserId)
                throw new UnauthorizedAccessException("Tylko właściciel może usunąć wycieczkę.");

            await _repository.DeleteAsync(request.TripId, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}