using MediatR;
using TripDrop.Application.Explore.Dto;

namespace TripDrop.Application.Explore.Queries {
    public record GetPublishedTripQuery(Guid PublicationId, Guid? CurrentUserId) : IRequest<PublishedTripDetailsDto>;
}
