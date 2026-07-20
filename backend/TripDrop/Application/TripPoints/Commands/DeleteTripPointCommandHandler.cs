using MediatR;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.TripPoints.Commands
{
    public class DeleteTripPointCommandHandler : IRequestHandler<DeleteTripPointCommand, Unit>
    {
        private readonly ITripPointRepository _tripPointRepository;
        private readonly ITripRepository _tripRepository;

        public DeleteTripPointCommandHandler(
            ITripPointRepository tripPointRepository,
            ITripRepository tripRepository)
        {
            _tripPointRepository = tripPointRepository;
            _tripRepository = tripRepository;
        }

        public async Task<Unit> Handle(DeleteTripPointCommand request, CancellationToken cancellationToken)
        {
            var point = await _tripPointRepository.GetByIdAsync(request.TripPointId, cancellationToken);

            if (point is null)
                throw new InvalidOperationException("Pinezka nie istnieje.");

            var trip = await _tripRepository.GetByIdAsync(point.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            var hasAccess = trip.OwnerId == request.CurrentUserId ||
                            trip.Participants.Any(p => p.UserId == request.CurrentUserId);

            if (!hasAccess)
                throw new UnauthorizedAccessException("Brak dostępu do tej wycieczki.");

            await _tripPointRepository.DeleteAsync(request.TripPointId, cancellationToken);
            await _tripPointRepository.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
