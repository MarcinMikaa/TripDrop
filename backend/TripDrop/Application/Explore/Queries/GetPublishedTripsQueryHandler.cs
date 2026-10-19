using MediatR;
using TripDrop.Application.Explore.Dto;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Explore.Queries
{
    public class GetPublishedTripsQueryHandler : IRequestHandler<GetPublishedTripsQuery, PublishedTripPageDto>
    {
        private const int DefaultTake = 24;
        private const int MaxTake = 48;
        private const int MaxSkip = 10_000;
        private const int MinSearchLength = 2;
        private const int MaxSearchLength = 100;
        private const int PreviewDecimals = 5;

        private readonly IPublishedTripRepository _repository;

        public GetPublishedTripsQueryHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<PublishedTripPageDto> Handle(GetPublishedTripsQuery request, CancellationToken cancellationToken)
        {
            var take = request.Take <= 0 ? DefaultTake : Math.Min(request.Take, MaxTake);
            var skip = Math.Clamp(request.Skip, 0, MaxSkip);

            var search = PublishedTrip.NormalizeForSearch(request.Search);
            if (search.Length > MaxSearchLength) search = search[..MaxSearchLength];
            var searchText = search.Length >= MinSearchLength ? search : null;

            var tags = (request.Tags ?? Array.Empty<string>())
                .Select(t => t.Trim().ToLowerInvariant())
                .Where(PublicationTags.All.Contains)
                .Distinct()
                .ToList();

            var minDays = request.MinDays is > 0 ? request.MinDays : null;
            var maxDays = request.MaxDays is > 0 ? request.MaxDays : null;

            var sort = string.Equals(request.Sort, "popular", StringComparison.OrdinalIgnoreCase)
                ? PublishedTripSort.MostCopied
                : PublishedTripSort.Newest;

            var rows = await _repository.SearchPublicAsync(
                new PublishedTripSearchCriteria(searchText, tags, minDays, maxDays, sort, skip, take + 1),
                cancellationToken);

            var items = rows.Take(take).Select(ToListItem).ToList();
            return new PublishedTripPageDto(items, rows.Count > take);
        }

        private static PublishedTripListItemDto ToListItem(PublishedTrip publication)
        {
            var content = PublicationContentSerializer.Deserialize(publication.Content);

            var preview = content.Days
                .SelectMany(day => day.Points.Select(point => new[]
                {
                    day.DayNumber - 1,
                    Math.Round(point.Lat, PreviewDecimals),
                    Math.Round(point.Lng, PreviewDecimals),
                }))
                .ToList();

            return new PublishedTripListItemDto(
                publication.Id,
                publication.Title,
                publication.Region,
                publication.Author.Username,
                publication.Tags,
                publication.DayCount,
                publication.PointCount,
                publication.TotalDistanceM,
                publication.CopyCount,
                publication.PublishedAt,
                publication.UpdatedAt,
                preview);
        }
    }
}
