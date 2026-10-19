using TripDrop.Domain.Enums;

namespace TripDrop.Domain.Repositories
{
    public record PublishedTripSearchCriteria(
        string? SearchText,
        IReadOnlyCollection<string> Tags,
        int? MinDays,
        int? MaxDays,
        PublishedTripSort Sort,
        int Skip,
        int Take);
}
