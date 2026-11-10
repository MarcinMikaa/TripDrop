namespace TripDrop.Infrastructure.Repositories
{
    public sealed class NearbyTripPointRow
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? DayIndex { get; set; }
        public double DistanceMeters { get; set; }
    }
}
