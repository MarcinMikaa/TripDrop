using MediatR;
using TripDrop.Application.Publications.Dto;

namespace TripDrop.Application.Publications.Queries
{
    public record GetTripPublicationQuery(Guid TripId, Guid UserId) : IRequest<TripPublicationDto?>;
}
