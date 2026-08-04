using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NetTopologySuite.Geometries;
namespace TripDrop.Domain.Entities
{
    public class TripPoint
    {
        public Guid Id { get; private set; }
        public Guid TripId { get; private set; }
        public Guid? UserId { get; private set; }
        public string Name { get; private set; } = string.Empty;
        public Point Location { get; private set; } = null!;
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
            Name = name ?? string.Empty;
            Location = new Point(longitude, latitude) { SRID = 4326 };
            DayIndex = dayIndex;
            Position = position;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Update(string name, int? dayIndex, int position)
        {
            Name = name ?? string.Empty;
            DayIndex = dayIndex;
            Position = position;
            UpdatedAt = DateTime.UtcNow;
        }
        public double Latitude => Location.Y;
        public double Longitude => Location.X;
    }
}

