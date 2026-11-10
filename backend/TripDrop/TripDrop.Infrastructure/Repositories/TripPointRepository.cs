using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;
using TripDrop.Infrastructure.Persistence;

namespace TripDrop.Infrastructure.Repositories
{
    public class TripPointRepository : ITripPointRepository
    {
        private readonly TripDropDbContext _dbContext;

        public TripPointRepository(TripDropDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<TripPoint>> GetByTripIdAsync(Guid tripId, CancellationToken cancellationToken)
        {
            return await _dbContext.TripPoints
                .Include(p => p.User)           
                .Where(p => p.TripId == tripId)
                .OrderBy(p => p.DayIndex)
                .ThenBy(p => p.Position)
                .ToListAsync(cancellationToken);
        }

        public async Task<TripPoint?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            return await _dbContext.TripPoints
                .Include(p => p.User)    
                .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<NearbyTripPoint>> GetNearestAsync(
            Guid tripId,
            double latitude,
            double longitude,
            Guid? excludePointId,
            double? radiusMeters,
            int limit,
            CancellationToken cancellationToken)
        {
            var excludedId = excludePointId ?? Guid.Empty;

            var query = radiusMeters is double radius
                ? _dbContext.Database.SqlQuery<NearbyTripPointRow>($"""
                    SELECT p."Id", p."Name", p."DayIndex",
                           ST_Distance(p."Location", ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography) AS "DistanceMeters"
                    FROM "TripPoints" AS p
                    WHERE p."TripId" = {tripId}
                      AND p."Id" <> {excludedId}
                      AND ST_DWithin(p."Location", ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography, {radius})
                    ORDER BY p."Location" <-> ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography
                    LIMIT {limit}
                    """)
                : _dbContext.Database.SqlQuery<NearbyTripPointRow>($"""
                    SELECT p."Id", p."Name", p."DayIndex",
                           ST_Distance(p."Location", ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography) AS "DistanceMeters"
                    FROM "TripPoints" AS p
                    WHERE p."TripId" = {tripId}
                      AND p."Id" <> {excludedId}
                    ORDER BY p."Location" <-> ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography
                    LIMIT {limit}
                    """);

            var rows = await query.ToListAsync(cancellationToken);

            return rows
                .Select(row => new NearbyTripPoint(row.Id, row.Name, row.DayIndex, row.DistanceMeters))
                .ToList();
        }

        public async Task AddAsync(TripPoint tripPoint, CancellationToken cancellationToken)
        {
            await _dbContext.TripPoints.AddAsync(tripPoint, cancellationToken);
        }

        public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
        {
            var point = await _dbContext.TripPoints.FindAsync(new object[] { id }, cancellationToken);
            if (point is not null)
                _dbContext.TripPoints.Remove(point);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
