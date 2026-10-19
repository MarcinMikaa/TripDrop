using TripDrop.Domain.Enums;

namespace TripDrop.Domain.Entities
{
    public record PublicationData(
        string Title,
        string? Description,
        string? Region,
        IReadOnlyCollection<string> Tags,
        PublicationVisibility Visibility,
        int DayCount,
        int PointCount,
        int? TotalDistanceM,
        int? TotalDurationS,
        string? TravelMode,
        double CenterLatitude,
        double CenterLongitude,
        string Content);
}
