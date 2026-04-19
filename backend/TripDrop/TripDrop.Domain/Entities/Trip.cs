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

        public double StartLatitude { get; private set; }
        public double StartLongitude { get; private set; }

        public Guid OwnerId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private Trip() { }

        public Trip(string name, double lat, double lon, Guid ownerId)
        {
            Id = Guid.NewGuid();
            Name = name;
            StartLatitude = lat;
            StartLongitude = lon;
            OwnerId = ownerId;
            CreatedAt = DateTime.UtcNow;
        }
    }
}
