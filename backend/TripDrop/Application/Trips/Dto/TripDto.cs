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
        int ParticipantCount,
        IEnumerable<TripParticipantDto> Participants
    );
}