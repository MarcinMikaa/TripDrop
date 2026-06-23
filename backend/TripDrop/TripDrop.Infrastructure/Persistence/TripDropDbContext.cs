using Microsoft.EntityFrameworkCore;
using TripDrop.Domain.Entities;

namespace TripDrop.Infrastructure.Persistence
{
    public class TripDropDbContext : DbContext
    {
        public TripDropDbContext(DbContextOptions<TripDropDbContext> options) : base(options) { }

        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Friendship> Friendships => Set<Friendship>();

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

            modelBuilder.Entity<Friendship>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Requester)
                    .WithMany(e => e.SentFriendRequests)
                    .HasForeignKey(e => e.RequesterId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Addressee)
                    .WithMany(u => u.ReceivedFriendRequests)
                    .HasForeignKey(e => e.AddresseeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.RequesterId, e.AddresseeId }).IsUnique();

                entity.Property(e => e.Status)
                    .HasConversion<string>()
                    .IsRequired();

                entity.Property(e => e.CreatedAt).IsRequired();
            });
        }
    }
}
