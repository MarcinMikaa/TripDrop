using TripDrop.Domain.Entities;

namespace TripDrop.Application.Publications.Dto
{
    internal static class TripPublicationMapper
    {
        public static TripPublicationDto ToDto(PublishedTrip publication, PublicationContent content) => new(
            publication.Id,
            publication.Title,
            publication.Description,
            publication.Region,
            publication.Tags,
            publication.Visibility.ToString().ToLowerInvariant(),
            publication.Status.ToString().ToLowerInvariant(),
            publication.DayCount,
            publication.PointCount,
            publication.CopyCount,
            publication.PublishedAt,
            publication.UpdatedAt,
            content.Days.SelectMany(d => d.Points).Select(p => p.SourcePointId).ToList());
    }
}
