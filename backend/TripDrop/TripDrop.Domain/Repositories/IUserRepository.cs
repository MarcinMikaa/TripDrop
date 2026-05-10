using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string emial, CancellationToken cancellationToken);
        Task AddAsync(User user, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
