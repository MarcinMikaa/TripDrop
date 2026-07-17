using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface ITripPointRepository
    {
        Task<IEnumerable<TripPoint>> GetByTripIdAsync(Guid tripId, CancellationToken cancellationToken);
        Task<TripPoint?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task AddAsync(TripPoint tripPoint, CancellationToken cancellationToken);
        Task DeleteAsync(Guid id, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
