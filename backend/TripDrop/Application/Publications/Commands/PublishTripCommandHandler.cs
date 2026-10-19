using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Publications.Commands
{
    public class PublishTripCommandHandler : IRequestHandler<PublishTripCommand, TripPublicationDto>
    {
        private const int MinTitleLength = 3;
        private const int MaxTitleLength = 80;
        private const int MaxDescriptionLength = 1000;
        private const int MaxRegionLength = 100;

        private readonly IPublishedTripRepository _repository;

        public PublishTripCommandHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<TripPublicationDto> Handle(PublishTripCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetSourceTripAsync(request.TripId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono wycieczki.");

            if (trip.OwnerId != request.UserId)
                throw new ForbiddenAccessException("Tylko właściciel może opublikować wycieczkę.");

            var title = request.Title?.Trim() ?? string.Empty;
            if (title.Length < MinTitleLength || title.Length > MaxTitleLength)
                throw new RequestValidationException(
                    $"Tytuł musi mieć od {MinTitleLength} do {MaxTitleLength} znaków.");

            var description = OptionalText(request.Description, MaxDescriptionLength, "Opis");
            var region = OptionalText(request.Region, MaxRegionLength, "Region");
            var tags = NormalizeTags(request.Tags);
            var visibility = ParseVisibility(request.Visibility);
            var dayCount = GetDayCount(trip);

            var selectedIds = (request.PointIds ?? Array.Empty<Guid>()).ToHashSet();
            if (selectedIds.Count == 0)
                throw new RequestValidationException("Wybierz przynajmniej jeden punkt do publikacji.");

            var tripPoints = await _repository.GetSourcePointsAsync(trip.Id, cancellationToken);
            var selected = tripPoints.Where(p => selectedIds.Contains(p.Id)).ToList();

            if (selected.Count != selectedIds.Count)
                throw new RequestValidationException("Część wybranych punktów nie należy do tej wycieczki.");

            if (selected.Any(p => p.DayIndex is null || p.DayIndex < 0 || p.DayIndex >= dayCount))
                throw new RequestValidationException("Publikować można tylko punkty przypisane do dni wycieczki.");

            var content = BuildContent(selected, dayCount);

            var data = new PublicationData(
                Title: title,
                Description: description,
                Region: region,
                Tags: tags,
                Visibility: visibility,
                DayCount: dayCount,
                PointCount: selected.Count,
                TotalDistanceM: null,
                TotalDurationS: null,
                TravelMode: null,
                CenterLatitude: (selected.Min(p => p.Latitude) + selected.Max(p => p.Latitude)) / 2,
                CenterLongitude: (selected.Min(p => p.Longitude) + selected.Max(p => p.Longitude)) / 2,
                Content: PublicationContentSerializer.Serialize(content));

            var publication = await _repository.GetBySourceTripIdAsync(trip.Id, cancellationToken);
            if (publication is null)
            {
                publication = new PublishedTrip(trip.Id, request.UserId, data);
                await _repository.AddAsync(publication, cancellationToken);
            }
            else
            {
                publication.Republish(data);
            }

            await _repository.SaveChangesAsync(cancellationToken);

            return TripPublicationMapper.ToDto(publication, content);
        }

        private static int GetDayCount(Trip trip)
        {
            if (trip.StartDate is null || trip.EndDate is null)
                throw new RequestValidationException("Ustaw daty wycieczki, żeby ją opublikować.");

            var dayCount = (trip.EndDate.Value.Date - trip.StartDate.Value.Date).Days + 1;
            if (dayCount < 1)
                throw new RequestValidationException("Data końca wycieczki jest wcześniejsza niż data początku.");

            return dayCount;
        }

        private static PublicationContent BuildContent(IReadOnlyCollection<TripPoint> selected, int dayCount) =>
            new()
            {
                Days = Enumerable.Range(0, dayCount)
                    .Select(dayIndex => new PublicationDay
                    {
                        DayNumber = dayIndex + 1,
                        Points = selected
                            .Where(p => p.DayIndex == dayIndex)
                            .OrderBy(p => p.Position)
                            .ThenBy(p => p.CreatedAt)
                            .Select(p => new PublicationPoint
                            {
                                SourcePointId = p.Id,
                                Name = p.Name,
                                Lat = p.Latitude,
                                Lng = p.Longitude,
                            })
                            .ToList(),
                    })
                    .ToList(),
            };

        private static string? OptionalText(string? value, int maxLength, string fieldName)
        {
            var trimmed = value?.Trim();
            if (string.IsNullOrEmpty(trimmed)) return null;
            if (trimmed.Length > maxLength)
                throw new RequestValidationException($"{fieldName} może mieć najwyżej {maxLength} znaków.");
            return trimmed;
        }

        private static List<string> NormalizeTags(IReadOnlyCollection<string>? tags)
        {
            var normalized = (tags ?? Array.Empty<string>())
                .Select(t => t?.Trim().ToLowerInvariant() ?? string.Empty)
                .Where(t => t.Length > 0)
                .Distinct()
                .ToList();

            if (normalized.Count > PublicationTags.MaxPerPublication)
                throw new RequestValidationException(
                    $"Możesz wybrać najwyżej {PublicationTags.MaxPerPublication} tagów.");

            var unknown = normalized.FirstOrDefault(t => !PublicationTags.All.Contains(t));
            if (unknown is not null)
                throw new RequestValidationException($"Nieznany tag: {unknown}.");

            return normalized;
        }

        private static PublicationVisibility ParseVisibility(string? value) =>
            value?.Trim().ToLowerInvariant() switch
            {
                "public" => PublicationVisibility.Public,
                "unlisted" => PublicationVisibility.Unlisted,
                _ => throw new RequestValidationException(
                    "Nieprawidłowa widoczność. Dozwolone wartości: public, unlisted."),
            };
    }
}
