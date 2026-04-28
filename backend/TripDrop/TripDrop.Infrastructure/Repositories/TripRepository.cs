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

        public async Task<IEnumerable<Trip>> GetAllAsync()
        {
            return await _dbContext.Trips.ToListAsync();
        }

        public async Task<Trip?> GetByIdAsync(Guid id)
        {
            return await _dbContext.Trips.FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task AddAsync(Trip trip)
        {
            await _dbContext.Trips.AddAsync(trip);
            await _dbContext.SaveChangesAsync();
        }
    }
}
