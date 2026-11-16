using Microsoft.EntityFrameworkCore;
using Npgsql;
using TripDrop.Application.Common.Exceptions;
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
            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } pg)
            {
                throw pg.ConstraintName switch
                {
                    TripDropDbContext.UsernameUniqueIndex => new ConflictException("Ta nazwa użytkownika jest już zajęta."),
                    TripDropDbContext.EmailUniqueIndex => new ConflictException("Ten e-mail jest już zajęty."),
                    _ => new ConflictException("Taki użytkownik już istnieje."),
                };
            }
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

        public async Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken)
        {
            var normalized = username.ToLowerInvariant();
            return await _dbContext.Users.AnyAsync(u => u.Username.ToLower() == normalized, cancellationToken);
        }
    }
}
