using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;
using TripDrop.Infrastructure.Persistence;

namespace TripDrop.Infrastructure.Repositories
{
    public class PublishedTripRepository : IPublishedTripRepository
    {
        private readonly TripDropDbContext _context;

        public PublishedTripRepository(TripDropDbContext context)
        {
            _context = context;
        }

        public Task<Trip?> GetSourceTripAsync(Guid tripId, CancellationToken cancellationToken) =>
            _context.Trips
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == tripId, cancellationToken);

        public Task<List<TripPoint>> GetSourcePointsAsync(Guid tripId, CancellationToken cancellationToken) =>
            _context.TripPoints
                .AsNoTracking()
                .Where(p => p.TripId == tripId)
                .ToListAsync(cancellationToken);

        public Task<PublishedTrip?> GetBySourceTripIdAsync(Guid tripId, CancellationToken cancellationToken) =>
            _context.PublishedTrips
                .FirstOrDefaultAsync(p => p.SourceTripId == tripId, cancellationToken);

        public Task<List<PublishedTrip>> SearchPublicAsync(
            PublishedTripSearchCriteria criteria,
            CancellationToken cancellationToken)
        {
            var query = _context.PublishedTrips
                .AsNoTracking()
                .Include(p => p.Author)
                .Where(p => p.Status == PublicationStatus.Active
                         && p.Visibility == PublicationVisibility.Public);

            if (!string.IsNullOrEmpty(criteria.SearchText))
                query = query.Where(p => p.SearchText.Contains(criteria.SearchText));

            foreach (var tag in criteria.Tags)
                query = query.Where(p => p.Tags.Contains(tag));

            if (criteria.MinDays is int minDays)
                query = query.Where(p => p.DayCount >= minDays);

            if (criteria.MaxDays is int maxDays)
                query = query.Where(p => p.DayCount <= maxDays);

            query = criteria.Sort == PublishedTripSort.MostCopied
                ? query.OrderByDescending(p => p.CopyCount)
                       .ThenByDescending(p => p.PublishedAt)
                       .ThenBy(p => p.Id)
                : query.OrderByDescending(p => p.PublishedAt)
                       .ThenBy(p => p.Id);

            return query
                .Skip(criteria.Skip)
                .Take(criteria.Take)
                .ToListAsync(cancellationToken);
        }

        public Task<PublishedTrip?> GetByIdWithAuthorAsync(Guid id, CancellationToken cancellationToken) =>
            _context.PublishedTrips
                .AsNoTracking()
                .Include(p => p.Author)
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        public async Task AddAsync(PublishedTrip publishedTrip, CancellationToken cancellationToken) =>
            await _context.PublishedTrips.AddAsync(publishedTrip, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);

        public async Task SaveCopyAsync(
            Trip trip,
            IReadOnlyCollection<TripPoint> points,
            Guid publicationId,
            CancellationToken cancellationToken)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                _context.Trips.Add(trip);
                _context.TripPoints.AddRange(points);
                await _context.SaveChangesAsync(cancellationToken);

                await _context.PublishedTrips
                    .Where(p => p.Id == publicationId)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(p => p.CopyCount, p => p.CopyCount + 1),
                        cancellationToken);

                await transaction.CommitAsync(cancellationToken);
            });
        }
    }
}
