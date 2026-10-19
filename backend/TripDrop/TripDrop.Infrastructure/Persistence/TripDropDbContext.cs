using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using TripDrop.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using TripDrop.Domain.Entities;

namespace TripDrop.Infrastructure.Persistence
{
    public class TripDropDbContext : DbContext
    {
        public TripDropDbContext(DbContextOptions<TripDropDbContext> options) : base(options) { }

        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Friendship> Friendships => Set<Friendship>();
        public DbSet<TripParticipant> TripParticipants => Set<TripParticipant>();
        public DbSet<TripPoint> TripPoints => Set<TripPoint>();
        public DbSet<PublishedTrip> PublishedTrips => Set<PublishedTrip>();

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

            modelBuilder.Entity<Trip>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.StartDate).IsRequired(false);
                entity.Property(e => e.EndDate).IsRequired(false);

                entity.HasOne(e => e.Owner)
                    .WithMany(u => u.OwnedTrips)
                    .HasForeignKey(e => e.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne<PublishedTrip>()
                    .WithMany()
                    .HasForeignKey(e => e.SourcePublishedTripId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<TripParticipant>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Trip)
                    .WithMany(t => t.Participants)
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.TripParticipations)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.TripId, e.UserId }).IsUnique();

                entity.Property(e => e.JoinedAt).IsRequired();
            });

            modelBuilder.Entity<TripPoint>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Location)
                    .HasColumnType("geography (Point, 4326)")
                    .IsRequired();
                entity.Property(e => e.Position).IsRequired();
                entity.Property(e => e.DayIndex).IsRequired(false);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();

                entity.HasOne(e => e.Trip)
                    .WithMany()
                    .HasForeignKey(e => e.TripId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.TripId);
                entity.HasIndex(e => e.Location).HasMethod("GIST");
            });

            modelBuilder.Entity<PublishedTrip>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(80);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.Region).HasMaxLength(100);
                entity.Property(e => e.SearchText).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Tags).HasColumnType("text[]").IsRequired();

                entity.Property(e => e.Visibility)
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.Status)
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.TravelMode).HasMaxLength(20);
                entity.Property(e => e.Center)
                    .HasColumnType("geography (Point, 4326)")
                    .IsRequired();
                entity.Property(e => e.Content).HasColumnType("jsonb").IsRequired();
                entity.Property(e => e.PublishedAt).IsRequired();

                entity.HasOne(e => e.Author)
                    .WithMany()
                    .HasForeignKey(e => e.AuthorId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.SourceTrip)
                    .WithMany()
                    .HasForeignKey(e => e.SourceTripId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.SourceTripId).IsUnique();
                entity.HasIndex(e => new { e.Status, e.Visibility, e.PublishedAt });
                entity.HasIndex(e => e.AuthorId);
                entity.HasIndex(e => e.Tags).HasMethod("GIN");
                entity.HasIndex(e => e.Center).HasMethod("GIST");
            });
        }
    }
}
