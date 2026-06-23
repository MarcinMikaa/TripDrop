using TripDrop.Domain.Enums;

namespace TripDrop.Domain.Entities
{
    public class Friendship
    {
        public Guid Id { get; private set; }
        public Guid RequesterId { get; private set; }
        public Guid AddresseeId { get; private set; }
        public FriendshipStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }

        public User Requester { get; private set; } = null;
        public User Addressee { get; private set; } = null;

        public Friendship(Guid requesterId, Guid addresseeId)
        {
            Id = Guid.NewGuid();
            RequesterId = requesterId;
            AddresseeId = addresseeId;
            Status = FriendshipStatus.Pending;
            CreatedAt = DateTime.UtcNow;
        }

        public void Accept()
        {
            if (Status != FriendshipStatus.Pending)
                throw new InvalidOperationException("Można zaakceptować tylko oczekujące zaproszenie.");
            Status = FriendshipStatus.Accepted;
        }

        public void Reject()
        {
            if (Status != FriendshipStatus.Pending)
                throw new InvalidOperationException("Można odrzucić tylko oczekujące zaproszenie.");
            Status = FriendshipStatus.Rejected;
        }

        private Friendship() { }
    }
}
