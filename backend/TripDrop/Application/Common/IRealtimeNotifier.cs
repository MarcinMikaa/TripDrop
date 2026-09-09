namespace TripDrop.Application.Common
{
    public interface IRealtimeNotifier
    {
        Task NotifyTripPointsChangedAsync(Guid tripId, CancellationToken cancellationToken);
        Task NotifyFriendRequestsChangedAsync(Guid userId, CancellationToken cancellationToken);
    }
}
