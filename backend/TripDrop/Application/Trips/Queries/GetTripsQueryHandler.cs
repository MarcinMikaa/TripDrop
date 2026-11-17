using MediatR;
using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips.Queries
{
    public class GetTripsQueryHandler : IRequestHandler<GetTripsQuery, IEnumerable<TripDto>>
    {
        private readonly ITripRepository _repository;
        private readonly IPublishedTripRepository _publications;
        private readonly ITripPointRepository _points;

        public GetTripsQueryHandler(
            ITripRepository repository,
            IPublishedTripRepository publications,
            ITripPointRepository points)
        {
            _repository = repository;
            _publications = publications;
            _points = points;
        }

        public async Task<IEnumerable<TripDto>> Handle(GetTripsQuery request, CancellationToken cancellationToken)
        {
            var trips = await _repository.GetByUserIdAsync(request.CurrentUserId, cancellationToken);

            var dtos = trips
                .Select(t => TripMapper.ToDto(t, request.CurrentUserId))
                .ToList();

            if (dtos.Count == 0) return dtos;

            var tripIds = dtos.Select(d => d.Id).ToList();

            var visibilities = await _publications.GetActiveVisibilitiesAsync(tripIds, cancellationToken);
            var points = await _points.GetByTripIdsAsync(tripIds, cancellationToken);
            var pointsByTrip = points.ToLookup(p => p.TripId);

            return dtos
                .Select(d => d with
                {
                    PublicationVisibility = visibilities.TryGetValue(d.Id, out var visibility)
                        ? visibility.ToString().ToLowerInvariant()
                        : d.PublicationVisibility,
                    Route = TripRouteBuilder.Build(
                        pointsByTrip[d.Id],
                        TripRouteBuilder.CountDays(d.StartDate, d.EndDate)),
                })
                .ToList();
        }
    }
}
