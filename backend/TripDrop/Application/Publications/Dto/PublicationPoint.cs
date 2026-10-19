namespace TripDrop.Application.Publications.Dto
{
    public sealed class PublicationPoint
    {
        public Guid SourcePointId { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
    }
}
