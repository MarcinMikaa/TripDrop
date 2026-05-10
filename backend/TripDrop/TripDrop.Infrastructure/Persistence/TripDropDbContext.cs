using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;

namespace TripDrop.Infrastructure.Persistence
{
    public class TripDropDbContext : DbContext
    {
        public TripDropDbContext(DbContextOptions<TripDropDbContext> options) : base(options) { }

        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<User> Users => Set<User>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Trip>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

                entity.HasOne(e => e.Owner)
                    .WithMany(u => u.OwnedTrips)
                    .HasForeignKey(e => e.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            
        }
    }
}
