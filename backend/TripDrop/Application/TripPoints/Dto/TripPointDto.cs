namespace TripDrop.Application.TripPoints.DTOs
{
    public record TripPointDto(
        Guid Id,
        Guid TripId,
        Guid? UserId,
        string? UserName,
        string Name,
        double Latitude,
        double Longitude,
        int? DayIndex,
        int Position,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );
}
