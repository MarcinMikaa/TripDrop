namespace TripDrop.Application.TripPoints.DTOs
{
    public record NearbyTripPointDto(
        Guid Id,
        string Name,
        int? DayIndex,
        double DistanceMeters
    );
}
