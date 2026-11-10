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

            query = criteria.Sort switch
            {
                PublishedTripSort.MostVoted => query
                    .OrderByDescending(p => p.VoteCount)
                    .ThenByDescending(p => p.PublishedAt)
                    .ThenBy(p => p.Id),
                PublishedTripSort.MostCopied => query
                    .OrderByDescending(p => p.CopyCount)
                    .ThenByDescending(p => p.PublishedAt)
                    .ThenBy(p => p.Id),
                _ => query
                    .OrderByDescending(p => p.PublishedAt)
                    .ThenBy(p => p.Id),
            };

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

        public Task<PublicationStatus?> GetStatusAsync(Guid id, CancellationToken cancellationToken) =>
            _context.PublishedTrips
                .Where(p => p.Id == id)
                .Select(p => (PublicationStatus?)p.Status)
                .FirstOrDefaultAsync(cancellationToken);

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

        public Task<bool> HasVotedAsync(Guid publicationId, Guid userId, CancellationToken cancellationToken) =>
            _context.PublishedTripVotes
                .AnyAsync(v => v.PublishedTripId == publicationId && v.UserId == userId, cancellationToken);
        public async Task<IReadOnlySet<Guid>> GetVotedPublicationIdsAsync(
            Guid userId,
            IReadOnlyCollection<Guid> publicationIds,
            CancellationToken cancellationToken)
        {
            if (publicationIds.Count == 0) return new HashSet<Guid>();

            var idList = publicationIds.ToList();

            var voted = await _context.PublishedTripVotes
                .AsNoTracking()
                .Where(v => v.UserId == userId && idList.Contains(v.PublishedTripId))
                .Select(v => v.PublishedTripId)
                .ToListAsync(cancellationToken);

            return voted.ToHashSet();
        }

        public async Task<int> SetVoteAsync(
            Guid publicationId,
            Guid userId,
            bool voted,
            CancellationToken cancellationToken)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                int changed;
                if (voted)
                {
                    changed = await _context.Database.ExecuteSqlInterpolatedAsync(
                        $@"INSERT INTO ""PublishedTripVotes"" (""PublishedTripId"", ""UserId"", ""CreatedAt"")
                           VALUES ({publicationId}, {userId}, {DateTime.UtcNow})
                           ON CONFLICT DO NOTHING",
                        cancellationToken);
                }
                else
                {
                    changed = await _context.PublishedTripVotes
                        .Where(v => v.PublishedTripId == publicationId && v.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }

                if (changed > 0)
                {
                    var delta = voted ? 1 : -1;
                    await _context.PublishedTrips
                        .Where(p => p.Id == publicationId)
                        .ExecuteUpdateAsync(
                            s => s.SetProperty(p => p.VoteCount, p => p.VoteCount + delta),
                            cancellationToken);
                }

                var voteCount = await _context.PublishedTrips
                    .Where(p => p.Id == publicationId)
                    .Select(p => p.VoteCount)
                    .SingleAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return voteCount;
            });
        }

        public async Task<IReadOnlyDictionary<Guid, PublicationVisibility>> GetActiveVisibilitiesAsync(
            IReadOnlyCollection<Guid> tripIds,
            CancellationToken cancellationToken)
        {
            if (tripIds.Count == 0) return new Dictionary<Guid, PublicationVisibility>();

            var ids = tripIds.ToList();

            return await _context.PublishedTrips
                .AsNoTracking()
                .Where(p => p.SourceTripId != null
                         && ids.Contains(p.SourceTripId.Value)
                         && p.Status == PublicationStatus.Active)
                .ToDictionaryAsync(p => p.SourceTripId!.Value, p => p.Visibility, cancellationToken);
        }
    }
}