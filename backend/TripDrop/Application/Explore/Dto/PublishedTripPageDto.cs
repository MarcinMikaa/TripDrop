namespace TripDrop.Application.Explore.Dto
{
    public sealed record PublishedTripPageDto(
        IReadOnlyList<PublishedTripListItemDto> Items,
        bool HasMore);
}
