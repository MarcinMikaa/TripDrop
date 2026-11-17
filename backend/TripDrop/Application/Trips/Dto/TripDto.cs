namespace TripDrop.Application.Trips.DTOs
{
    public record TripParticipantDto(Guid Id, string Username);

    public record TripRouteDto(
        int PointCount,
        int UnassignedPointCount,
        IReadOnlyList<int> DayPointCounts,
        IReadOnlyList<double?[]> Preview
    );

    public record TripDto(
        Guid Id,
        string Name,
        string? Description,
        DateTime? StartDate,
        DateTime? EndDate,
        DateTime CreatedAt,
        bool IsOwner,
        Guid OwnerId,
        string OwnerUsername,
        int ParticipantCount,
        IEnumerable<TripParticipantDto> Participants,
        DateTime? PlanLockedAt,
        string? PublicationVisibility = null,
        TripRouteDto? Route = null
    );

    public record TripPlanLockDto(bool IsPlanLocked, DateTime? PlanLockedAt);
}
