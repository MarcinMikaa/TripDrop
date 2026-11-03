namespace TripDrop.Domain.Entities
{
    public class PublishedTripVote
    {
        public Guid PublishedTripId { get; private set; }
        public Guid UserId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private PublishedTripVote() { }
    }
}
