namespace TripDrop.Application.Publications.Dto
{
    public sealed record TripPublicationDto(
        Guid Id,
        string Title,
        string? Description,
        string? Region,
        IReadOnlyList<string> Tags,
        string Visibility,
        string Status,
        int DayCount,
        int PointCount,
        int CopyCount,
        DateTime PublishedAt,
        DateTime? UpdatedAt,
        IReadOnlyList<Guid> PointIds);
}
