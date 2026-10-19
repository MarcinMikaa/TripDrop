namespace TripDrop.Application.Explore.Dto
{
    public sealed record PublishedTripDayDto(
        int DayNumber,
        int? DistanceM,
        int? DurationS,
        IReadOnlyList<double[]>? RouteGeometry,
        IReadOnlyList<PublishedTripPointDto> Points);
}
