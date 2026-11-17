using TripDrop.Application.Trips.DTOs;
using TripDrop.Domain.Entities;

namespace TripDrop.Application.Trips
{
    public static class TripRouteBuilder
    {
        public const int MaxPreviewPoints = 60;
        private const int MaxDays = 366;
        private const int CoordinateDecimals = 5;

        private sealed record PlacedPoint(TripPoint Point, int? Day);

        public static int CountDays(DateTime? startDate, DateTime? endDate)
        {
            if (startDate is null || endDate is null) return 0;

            var days = (endDate.Value.Date - startDate.Value.Date).Days + 1;
            return Math.Clamp(days, 0, MaxDays);
        }

        public static TripRouteDto Build(IEnumerable<TripPoint> points, int dayCount)
        {
            var placed = points
                .Select(p => new PlacedPoint(p, IsValidDay(p.DayIndex, dayCount) ? p.DayIndex : null))
                .OrderBy(p => p.Day is null)
                .ThenBy(p => p.Day)
                .ThenBy(p => p.Point.Position)
                .ThenBy(p => p.Point.CreatedAt)
                .ToList();

            var dayPointCounts = new int[Math.Max(dayCount, 0)];
            var unassigned = 0;

            foreach (var item in placed)
            {
                if (item.Day is int day) dayPointCounts[day]++;
                else unassigned++;
            }

            var preview = Sample(placed, MaxPreviewPoints)
                .Select(item => new double?[]
                {
                    item.Day + 1,
                    Math.Round(item.Point.Latitude, CoordinateDecimals),
                    Math.Round(item.Point.Longitude, CoordinateDecimals),
                })
                .ToList();

            return new TripRouteDto(placed.Count, unassigned, dayPointCounts, preview);
        }

        private static bool IsValidDay(int? dayIndex, int dayCount) =>
            dayIndex is int day && day >= 0 && day < dayCount;

        private static IEnumerable<PlacedPoint> Sample(IReadOnlyList<PlacedPoint> items, int limit)
        {
            if (items.Count <= limit) return items;

            return Enumerable.Range(0, limit)
                .Select(i => items[(int)((long)i * items.Count / limit)]);
        }
    }
}
