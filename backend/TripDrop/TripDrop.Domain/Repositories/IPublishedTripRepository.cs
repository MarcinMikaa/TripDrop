using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;

namespace TripDrop.Domain.Repositories
{
    public interface IPublishedTripRepository
    {
        Task<Trip?> GetSourceTripAsync(Guid tripId, CancellationToken cancellationToken);
        Task<List<TripPoint>> GetSourcePointsAsync(Guid tripId, CancellationToken cancellationToken);
        Task<PublishedTrip?> GetBySourceTripIdAsync(Guid tripId, CancellationToken cancellationToken);
        Task<List<PublishedTrip>> SearchPublicAsync(PublishedTripSearchCriteria criteria, CancellationToken cancellationToken);
        Task<PublishedTrip?> GetByIdWithAuthorAsync(Guid id, CancellationToken cancellationToken);
        Task<PublicationStatus?> GetStatusAsync(Guid id, CancellationToken cancellationToken);
        Task AddAsync(PublishedTrip publishedTrip, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
        Task SaveCopyAsync(Trip trip, IReadOnlyCollection<TripPoint> points, Guid publicationId, CancellationToken cancellationToken);

        Task<bool> HasVotedAsync(Guid publicationId, Guid userId, CancellationToken cancellationToken);
        Task<IReadOnlySet<Guid>> GetVotedPublicationIdsAsync(Guid userId, IReadOnlyCollection<Guid> publicationIds, CancellationToken cancellationToken);
        Task<int> SetVoteAsync(Guid publicationId, Guid userId, bool voted, CancellationToken cancellationToken);
        Task<IReadOnlyDictionary<Guid, PublicationVisibility>> GetActiveVisibilitiesAsync(IReadOnlyCollection<Guid> tripIds, CancellationToken cancellationToken);
    }
}
