namespace TripDrop.Application.Trips.DTOs
{
    public record TripParticipantDto(Guid Id, string Username);

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
        string? PublicationVisibility = null
    );

    public record TripPlanLockDto(bool IsPlanLocked, DateTime? PlanLockedAt);
}
