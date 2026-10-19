using MediatR;
using TripDrop.Application.Explore.Dto;

namespace TripDrop.Application.Explore.Queries
{
    public record GetPublishedTripsQuery(
        string? Search,
        IReadOnlyCollection<string>? Tags,
        int? MinDays,
        int? MaxDays,
        string? Sort,
        int Skip,
        int Take) : IRequest<PublishedTripPageDto>;
}
