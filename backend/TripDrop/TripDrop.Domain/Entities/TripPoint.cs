using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace TripDrop.Domain.Entities
{
    public class TripPoint
    {
        public Guid Id { get; private set; }
        public Guid TripId { get; private set; }
        public Guid? UserId { get; private set; }
        public string Name { get; private set; } = string.Empty;
        public double Latitude { get; private set; }
        public double Longitude { get; private set; }
        public int? DayIndex { get; private set; }
        public int Position { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime UpdatedAt { get; private set; }

        public Trip Trip { get; private set; } = null!;
        public User? User { get; private set; }

        private TripPoint() { }

        public TripPoint(
            Guid tripId,
            Guid? userId,
            string name,
            double latitude,
            double longitude,
            int? dayIndex,
            int position)
        {
            Id = Guid.NewGuid();
            TripId = tripId;
            UserId = userId;
            Name = name;
            Latitude = latitude;
            Longitude = longitude;
            DayIndex = dayIndex;
            Position = position;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}

