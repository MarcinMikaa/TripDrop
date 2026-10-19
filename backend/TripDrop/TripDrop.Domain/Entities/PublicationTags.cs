namespace TripDrop.Domain.Entities
{
    public static class PublicationTags
    {
        public const int MaxPerPublication = 5;

        public static readonly IReadOnlySet<string> All = new HashSet<string>
        {
            "city", "mountains", "sea", "lakes", "nature", "heritage",
            "food", "active", "relax", "kids", "dogs", "budget",
        };
    }
}
