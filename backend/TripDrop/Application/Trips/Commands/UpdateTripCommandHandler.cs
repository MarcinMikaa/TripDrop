using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class UpdateTripCommandHandler : IRequestHandler<UpdateTripCommand, Unit>
    {
        private readonly ITripRepository _repository;
        public UpdateTripCommandHandler(ITripRepository repository) => _repository = repository;

        public async Task<Unit> Handle(UpdateTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken);
            if (trip is null) throw new InvalidOperationException("Wycieczka nie istnieje.");
            if (trip.OwnerId != request.CurrentUserId) throw new UnauthorizedAccessException("Tylko właściciel może edytować wycieczkę.");

            trip.UpdateDetails(request.Name, request.Description, request.StartDate, request.EndDate);
            await _repository.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
