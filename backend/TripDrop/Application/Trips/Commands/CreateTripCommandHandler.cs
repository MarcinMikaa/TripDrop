using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Commands
{
    public class CreateTripCommandHandler : IRequestHandler<CreateTripCommand, Guid>
    {
        private readonly ITripRepository _tripRepository;
        private readonly IUserRepository _userRepository;

        public CreateTripCommandHandler(ITripRepository tripRepository, IUserRepository userRepository)
        {
            _tripRepository = tripRepository;
            _userRepository = userRepository;
        }

        public async Task<Guid> Handle(CreateTripCommand request, CancellationToken cancellationToken)
        {
            var trip = new Trip(request.Name, request.OwnerId, request.Description, request.StartDate, request.EndDate);

            foreach (var participantId in request.ParticipantIds)
            {
                var user = await _userRepository.GetByIdAsync(participantId, cancellationToken);
                if (user is null) continue;

                if (participantId == request.OwnerId) continue;

                trip.Participants.Add(new TripParticipant(trip.Id, participantId));
            }

            await _tripRepository.AddAsync(trip, cancellationToken);
            await _tripRepository.SaveChangesAsync(cancellationToken);
            return trip.Id;
        }
    }
}