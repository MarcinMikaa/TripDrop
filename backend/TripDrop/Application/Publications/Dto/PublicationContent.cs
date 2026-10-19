using TripDrop.Domain.Entities;

namespace TripDrop.Application.Publications.Dto
{
    public sealed class PublicationContent
    {
        public const int CurrentSchemaVersion = 1;

        public int SchemaVersion { get; set; } = CurrentSchemaVersion;
        public List<PublicationDay> Days { get; set; } = new();
    }
}
