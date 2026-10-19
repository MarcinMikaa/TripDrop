using System.Globalization;
using System.Text;
using NetTopologySuite.Geometries;
using TripDrop.Domain.Enums;

namespace TripDrop.Domain.Entities
{
    public class PublishedTrip
    {
        public Guid Id { get; private set; }
        public Guid? SourceTripId { get; private set; }
        public Guid AuthorId { get; private set; }

        public string Title { get; private set; } = string.Empty;
        public string? Description { get; private set; }
        public string? Region { get; private set; }
        public string SearchText { get; private set; } = string.Empty;
        public List<string> Tags { get; private set; } = new();
        public PublicationVisibility Visibility { get; private set; }
        public PublicationStatus Status { get; private set; }

        public int DayCount { get; private set; }
        public int PointCount { get; private set; }
        public int? TotalDistanceM { get; private set; }
        public int? TotalDurationS { get; private set; }
        public string? TravelMode { get; private set; }
        public Point Center { get; private set; } = null!;

        public string Content { get; private set; } = string.Empty;

        public int CopyCount { get; private set; }
        public DateTime PublishedAt { get; private set; }
        public DateTime? UpdatedAt { get; private set; }

        public User Author { get; private set; } = null!;
        public Trip? SourceTrip { get; private set; }

        private PublishedTrip() { }

        public PublishedTrip(Guid sourceTripId, Guid authorId, PublicationData data)
        {
            Id = Guid.NewGuid();
            SourceTripId = sourceTripId;
            AuthorId = authorId;
            Status = PublicationStatus.Active;
            PublishedAt = DateTime.UtcNow;
            Apply(data);
        }

        public void Republish(PublicationData data)
        {
            Apply(data);
            Status = PublicationStatus.Active;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Withdraw()
        {
            if (Status == PublicationStatus.Withdrawn) return;
            Status = PublicationStatus.Withdrawn;
            UpdatedAt = DateTime.UtcNow;
        }

        private void Apply(PublicationData data)
        {
            Title = data.Title.Trim();
            Description = string.IsNullOrWhiteSpace(data.Description) ? null : data.Description.Trim();
            Region = string.IsNullOrWhiteSpace(data.Region) ? null : data.Region.Trim();
            Tags = data.Tags.Distinct().ToList();
            Visibility = data.Visibility;
            DayCount = data.DayCount;
            PointCount = data.PointCount;
            TotalDistanceM = data.TotalDistanceM;
            TotalDurationS = data.TotalDurationS;
            TravelMode = data.TravelMode;
            Center = new Point(data.CenterLongitude, data.CenterLatitude) { SRID = 4326 };
            Content = data.Content;
            SearchText = BuildSearchText(Title, Region);
        }

        public static string NormalizeForSearch(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var source = value.Trim().ToLowerInvariant().Replace('ł', 'l');
            var decomposed = source.Normalize(NormalizationForm.FormD);

            var builder = new StringBuilder(decomposed.Length);
            foreach (var c in decomposed)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    builder.Append(c);
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static string BuildSearchText(string title, string? region) =>
            NormalizeForSearch($"{title} {region}");
    }
}
