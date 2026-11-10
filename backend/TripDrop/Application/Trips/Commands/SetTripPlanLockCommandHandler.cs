using MediatR;
using TripDrop.Application.Common;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class SetTripPlanLockCommandHandler : IRequestHandler<SetTripPlanLockCommand, TripPlanLockDto>
    {
        private readonly ITripRepository _repository;
        private readonly IRealtimeNotifier _realtimeNotifier;

        public SetTripPlanLockCommandHandler(ITripRepository repository, IRealtimeNotifier realtimeNotifier)
        {
            _repository = repository;
            _realtimeNotifier = realtimeNotifier;
        }

        public async Task<TripPlanLockDto> Handle(SetTripPlanLockCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetByIdAsync(request.TripId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono wycieczki.");

            if (trip.OwnerId != request.CurrentUserId)
                throw new ForbiddenAccessException("Tylko właściciel może zakończyć lub wznowić planowanie.");

            if (trip.IsPlanLocked != request.Locked)
            {
                if (request.Locked)
                    trip.LockPlan();
                else
                    trip.UnlockPlan();

                await _repository.SaveChangesAsync(cancellationToken);
                await _realtimeNotifier.NotifyTripPlanLockChangedAsync(trip.Id, trip.IsPlanLocked, CancellationToken.None);
            }

            return new TripPlanLockDto(trip.IsPlanLocked, trip.PlanLockedAt);
        }
    }
}
