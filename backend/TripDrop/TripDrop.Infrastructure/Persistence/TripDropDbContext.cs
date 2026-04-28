using Microsoft.EntityFrameworkCore;

using TripDrop.Domain.Entities;

namespace TripDrop.Infrastructure.Persistence
{
    public class TripDropDbContext : DbContext
    {
        public TripDropDbContext(DbContextOptions<TripDropDbContext> options) : base(options)
        {
        }

        public DbSet<Trip> Trips => Set<Trip>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Trip>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
