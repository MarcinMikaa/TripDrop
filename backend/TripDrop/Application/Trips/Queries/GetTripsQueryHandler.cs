using MediatR;
using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Queries
{
    public class GetTripsQueryHandler : IRequestHandler<GetTripsQuery, IEnumerable<TripDto>>
    {
        private readonly ITripRepository _repository;
        private readonly IPublishedTripRepository _publications;

        public GetTripsQueryHandler(ITripRepository repository, IPublishedTripRepository publications)
        {
            _repository = repository;
            _publications = publications;
        }

        public async Task<IEnumerable<TripDto>> Handle(GetTripsQuery request, CancellationToken cancellationToken)
        {
            var trips = await _repository.GetByUserIdAsync(request.CurrentUserId, cancellationToken);

            var dtos = trips
                .Select(t => TripMapper.ToDto(t, request.CurrentUserId))
                .ToList();

            var visibilities = await _publications.GetActiveVisibilitiesAsync(
                dtos.Select(d => d.Id).ToList(), cancellationToken);

            return dtos
                .Select(d => visibilities.TryGetValue(d.Id, out var visibility)
                    ? d with { PublicationVisibility = visibility.ToString().ToLowerInvariant() }
                    : d)
                .ToList();
        }
    }
}
