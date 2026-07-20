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
