namespace TripDrop.Application.Explore.Dto
{
    public sealed record PublishedTripListItemDto(
        Guid Id,
        string Title,
        string? Region,
        string Author,
        IReadOnlyList<string> Tags,
        int DayCount,
        int PointCount,
        int? TotalDistanceM,
        int CopyCount,
        DateTime PublishedAt,
        DateTime? UpdatedAt,
        IReadOnlyList<double[]> Preview);
}
