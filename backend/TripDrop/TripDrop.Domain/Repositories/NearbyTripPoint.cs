namespace TripDrop.Domain.Repositories
{
    public record NearbyTripPoint(
        Guid Id,
        string Name,
        int? DayIndex,
        double DistanceMeters);
}
