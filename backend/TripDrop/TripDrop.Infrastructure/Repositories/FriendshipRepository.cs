using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;
using TripDrop.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace TripDrop.Infrastructure.Repositories
{
    public class FriendshipRepository : IFriendshipRepository
    {
        private readonly TripDropDbContext _dbContext;

        public FriendshipRepository(TripDropDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Friendship?> GetBetweenUserAsync(Guid userAId, Guid userBId, CancellationToken cancellationToken)
        {
            return await _dbContext.Friendships.FirstOrDefaultAsync(f =>
                (f.RequesterId == userAId && f.AddresseeId == userBId) ||
                (f.RequesterId == userBId && f.AddresseeId == userAId), cancellationToken);
        }

        public async Task<IEnumerable<Friendship>> GetPendingForUserAsync(Guid addresseeId, CancellationToken cancellationToken)
        {
            return await _dbContext.Friendships
                .Include(f => f.Requester)
                .Where(f => f.AddresseeId == addresseeId && f.Status == FriendshipStatus.Pending)
                .ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<Friendship>> GetAcceptedForUserAsync(Guid userId, CancellationToken cancellationToken)
        {
            return await _dbContext.Friendships
                .Include(f => f.Requester)
                .Include(f => f.Addressee)
                .Where(f =>
                    (f.RequesterId == userId || f.AddresseeId == userId) &&
                    f.Status == FriendshipStatus.Accepted)
                .ToListAsync(cancellationToken);
        }

        public async Task<Friendship?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            return await _dbContext.Friendships.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
        }

        public async Task AddAsync(Friendship friendship, CancellationToken cancellationToken)
        {
            await _dbContext.Friendships.AddAsync(friendship, cancellationToken);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
