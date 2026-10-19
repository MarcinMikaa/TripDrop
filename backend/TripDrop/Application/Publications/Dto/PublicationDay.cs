namespace TripDrop.Application.Publications.Dto
{
    public sealed class PublicationDay
    {
        public int DayNumber { get; set; }
        public int? DistanceM { get; set; }
        public int? DurationS { get; set; }
        public List<double[]>? RouteGeometry { get; set; }
        public List<PublicationPoint> Points { get; set; } = new();
    }
}
