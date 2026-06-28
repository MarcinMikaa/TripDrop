using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;
using TripDrop.Infrastructure.Persistence;

namespace TripDrop.Infrastructure.Repositories
{
    public class TripRepository : ITripRepository
    {
        private readonly TripDropDbContext _dbContext;

        public TripRepository(TripDropDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Trip>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken)
        {
            return await _dbContext.Trips
                .Include(t => t.Participants)
                    .ThenInclude(p => p.User)
                .Where(t => t.OwnerId == userId ||
                            t.Participants.Any(p => p.UserId == userId))
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<Trip?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            return await _dbContext.Trips
                .Include(t => t.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        }

        public async Task AddAsync(Trip trip, CancellationToken cancellationToken)
        {
            await _dbContext.Trips.AddAsync(trip, cancellationToken);
        }

        public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
        {
            var trip = await _dbContext.Trips.FindAsync(new object[] { id }, cancellationToken);
            if (trip is not null)
                _dbContext.Trips.Remove(trip);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}