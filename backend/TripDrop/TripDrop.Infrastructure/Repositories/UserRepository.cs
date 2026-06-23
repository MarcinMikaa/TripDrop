using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;
using TripDrop.Infrastructure.Persistence;

namespace TripDrop.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly TripDropDbContext _dbContext;

        public UserRepository(TripDropDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
        {
            return await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        }

        public async Task AddAsync(User user, CancellationToken cancellationToken)
        {
            await _dbContext.Users.AddAsync(user, cancellationToken);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            return await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        }

        public async Task<IEnumerable<User>> SearchByUsernameAsync(string searchTerm, Guid excludeUserId, CancellationToken cancellationToken)
        {
            return await _dbContext.Users
                .Where(u => u.Id != excludeUserId && u.Username.ToLower().Contains(searchTerm.ToLower()))
                .ToListAsync(cancellationToken);
        }
    }
}
