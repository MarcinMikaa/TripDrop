using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface IFriendshipRepository
    {
        Task<Friendship?> GetBetweenUserAsync(Guid userAId, Guid userBId, CancellationToken cancellationToken);
        Task<IEnumerable<Friendship>> GetPendingForUserAsync(Guid addresseeId, CancellationToken cancellationToken);
        Task<IEnumerable<Friendship>> GetAcceptedForUserAsync(Guid userId, CancellationToken cancellationToken);
        Task<Friendship?> GetByIdAsync(Guid id, CancellationToken ctcancellationToken);

        Task AddAsync(Friendship friendship, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
