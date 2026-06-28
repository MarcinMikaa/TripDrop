using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TripDrop.Domain.Entities
{
    public class User
    {
        public Guid Id { get; private set; }
        public string Email { get; private set; }
        public string Username { get; private set; }

        public ICollection<Trip> OwnedTrips { get; private set; } = new List<Trip>();
        public ICollection<Friendship> SentFriendRequests { get; private set; } = new List<Friendship>();
        public ICollection<Friendship> ReceivedFriendRequests { get; private set; } = new List<Friendship>();
        public ICollection<TripParticipant> TripParticipations { get; private set; } = new List<TripParticipant>();

        public User(Guid id, string email, string username)
        {
            Id = id;
            Email = email;
            Username = username;
        }

        private User() { }
    }
}
