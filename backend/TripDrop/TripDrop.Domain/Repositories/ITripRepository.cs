using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface ITripRepository
    {
        Task<IEnumerable<Trip>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken);
        Task<Trip?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task AddAsync(Trip trip, CancellationToken cancellationToken);
        Task DeleteAsync(Guid id, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
