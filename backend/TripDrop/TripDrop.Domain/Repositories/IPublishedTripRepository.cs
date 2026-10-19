using TripDrop.Domain.Entities;

namespace TripDrop.Domain.Repositories
{
    public interface IPublishedTripRepository
    {
        Task<Trip?> GetSourceTripAsync(Guid tripId, CancellationToken cancellationToken);
        Task<List<TripPoint>> GetSourcePointsAsync(Guid tripId, CancellationToken cancellationToken);
        Task<PublishedTrip?> GetBySourceTripIdAsync(Guid tripId, CancellationToken cancellationToken);
        Task<List<PublishedTrip>> SearchPublicAsync(PublishedTripSearchCriteria criteria, CancellationToken cancellationToken);
        Task<PublishedTrip?> GetByIdWithAuthorAsync(Guid id, CancellationToken cancellationToken);
        Task AddAsync(PublishedTrip publishedTrip, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
        Task SaveCopyAsync(Trip trip, IReadOnlyCollection<TripPoint> points, Guid publicationId, CancellationToken cancellationToken);
    }
}
