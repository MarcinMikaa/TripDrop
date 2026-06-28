using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TripDrop.Domain.Entities
{
    public class Trip
    {
        public Guid Id { get; private set; }
        public string Name { get; private set; } = string.Empty;
        public string? Description { get; private set; }
        public Guid OwnerId { get; private set; }
        public DateTime? StartDate { get; private set; }
        public DateTime? EndDate { get; private set; }
        public DateTime CreatedAt { get; private set; }

        public virtual User Owner { get; private set; } = null!;
        public ICollection<TripParticipant> Participants { get; private set; } = new List<TripParticipant>();

        private Trip() { }

        public Trip(string name, Guid ownerId, string? description = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            Id = Guid.NewGuid();
            Name = name;
            OwnerId = ownerId;
            Description = description;
            StartDate = startDate;
            EndDate = endDate;
            CreatedAt = DateTime.UtcNow;
        }
    }
}
