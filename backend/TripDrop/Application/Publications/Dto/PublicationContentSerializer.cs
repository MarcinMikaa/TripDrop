using System.Text.Json;

namespace TripDrop.Application.Publications.Dto
{
    public static class PublicationContentSerializer
    {
        private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

        public static string Serialize(PublicationContent content) =>
            JsonSerializer.Serialize(content, Options);

        public static PublicationContent Deserialize(string json) =>
            JsonSerializer.Deserialize<PublicationContent>(json, Options)
            ?? throw new InvalidOperationException("Zawartość publikacji jest pusta.");
    }
}
