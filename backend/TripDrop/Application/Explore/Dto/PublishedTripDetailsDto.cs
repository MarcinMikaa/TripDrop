namespace TripDrop.Application.Explore.Dto
{
    public sealed record PublishedTripDetailsDto(
        Guid Id,
        string Title,
        string? Description,
        string? Region,
        string Author,
        IReadOnlyList<string> Tags,
        string Visibility,
        int DayCount,
        string? TravelMode,
        int? TotalDistanceM,
        int? TotalDurationS,
        int CopyCount,
        int VoteCount,
        bool HasVoted,
        DateTime PublishedAt,
        DateTime? UpdatedAt,
        bool IsMine,
        Guid? ManageTripId,
        IReadOnlyList<PublishedTripDayDto> Days);
}
