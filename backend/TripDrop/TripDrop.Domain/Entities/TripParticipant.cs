namespace TripDrop.Domain.Entities
{
    public class TripParticipant
    {
        public Guid Id { get; private set; }
        public Guid TripId { get; private set; }
        public Guid UserId { get; private set; }
        public DateTime JoinedAt { get; private set; }

        public Trip Trip { get; private set; } = null!;
        public User User { get; private set; } = null!;

        public TripParticipant(Guid tripId, Guid userId)
        {
            Id = Guid.NewGuid();
            TripId = tripId;
            UserId = userId;
            JoinedAt = DateTime.UtcNow;
        }

        private TripParticipant() { }
    }
}
