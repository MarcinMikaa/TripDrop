using MediatR;
using TripDrop.Application.TripPoints.DTOs;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.TripPoints.Commands
{
    public class CreateTripPointCommandHandler : IRequestHandler<CreateTripPointCommand, TripPointDto>
    {
        private readonly ITripPointRepository _tripPointRepository;
        private readonly ITripRepository _tripRepository;

        public CreateTripPointCommandHandler(
            ITripPointRepository tripPointRepository,
            ITripRepository tripRepository)
        {
            _tripPointRepository = tripPointRepository;
            _tripRepository = tripRepository;
        }

        public async Task<TripPointDto> Handle(CreateTripPointCommand request, CancellationToken cancellationToken)
        {
            var trip = await _tripRepository.GetByIdAsync(request.TripId, cancellationToken);

            if (trip is null)
                throw new InvalidOperationException("Wycieczka nie istnieje.");

            var hasAccess = trip.OwnerId == request.CurrentUserId ||
                            trip.Participants.Any(p => p.UserId == request.CurrentUserId);

            if (!hasAccess)
                throw new UnauthorizedAccessException("Brak dostępu do tej wycieczki.");

            var existingPoints = await _tripPointRepository.GetByTripIdAsync(request.TripId, cancellationToken);
            var nextPosition = existingPoints
                .Where(p => p.DayIndex == request.DayIndex)
                .Select(p => p.Position)
                .DefaultIfEmpty(-1)
                .Max() + 1;

            var point = new TripPoint(
                request.TripId,
                request.CurrentUserId,
                request.Name,
                request.Latitude,
                request.Longitude,
                request.DayIndex,
                nextPosition
            );

            await _tripPointRepository.AddAsync(point, cancellationToken);
            await _tripPointRepository.SaveChangesAsync(cancellationToken);

            var withUser = await _tripPointRepository.GetByIdAsync(point.Id, cancellationToken);

            return new TripPointDto(
                withUser!.Id,
                withUser.TripId,
                withUser.UserId,
                withUser.User?.Username,
                withUser.Name,
                withUser.Latitude,
                withUser.Longitude,
                withUser.DayIndex,
                withUser.Position,
                withUser.CreatedAt,
                withUser.UpdatedAt
            );
        }
    }
}
