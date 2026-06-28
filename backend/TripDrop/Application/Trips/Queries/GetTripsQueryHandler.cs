using MediatR;
using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Queries
{
    public class GetTripsQueryHandler : IRequestHandler<GetTripsQuery, IEnumerable<TripDto>>
    {
        private readonly ITripRepository _repository;

        public GetTripsQueryHandler(ITripRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<TripDto>> Handle(GetTripsQuery request, CancellationToken cancellationToken)
        {
            var trips = await _repository.GetByUserIdAsync(request.CurrentUserId, cancellationToken);

            return trips.Select(t => new TripDto(
                t.Id,
                t.Name,
                t.Description,
                t.StartDate,
                t.EndDate,
                t.CreatedAt,
                IsOwner: t.OwnerId == request.CurrentUserId,
                ParticipantCount: t.Participants.Count,
                Participants: t.Participants.Select(p => new TripParticipantDto(p.User.Id, p.User.Username))
            ));
        }
    }
}