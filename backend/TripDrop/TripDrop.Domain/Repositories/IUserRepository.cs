using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken);
        Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task<IEnumerable<User>> SearchByUsernameAsync(string searchTerm, Guid excludeUserId, CancellationToken cancellationToken);
        Task AddAsync(User user, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
