using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface ITripRepository
    {
        Task<IEnumerable<Trip>> GetAllAsync();
        Task<Trip?> GetByIdAsync(Guid id);
        Task AddAsync(Trip trip);
    }
}
