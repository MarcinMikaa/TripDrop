using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;
using TripDrop.Application.Common;

namespace TripDrop.Application.TripPoints.Commands
{
    public class DeleteTripPointCommandHandler : IRequestHandler<DeleteTripPointCommand, Unit>
    {
        private readonly ITripPointRepository _tripPointRepository;
        private readonly ITripRepository _tripRepository;
        private readonly IRealtimeNotifier _realtimeNotifier;

        public DeleteTripPointCommandHandler(
            ITripPointRepository tripPointRepository,
            ITripRepository tripRepository,
            IRealtimeNotifier realtimeNotifier)
        {
            _tripPointRepository = tripPointRepository;
            _tripRepository = tripRepository;
            _realtimeNotifier = realtimeNotifier;
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

            var tripId = point.TripId;

            await _tripPointRepository.DeleteAsync(request.TripPointId, cancellationToken);
            await _tripPointRepository.SaveChangesAsync(cancellationToken);
            await _realtimeNotifier.NotifyTripPointsChangedAsync(tripId, cancellationToken);

            return Unit.Value;
        }
    }
}
