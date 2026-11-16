using MediatR;
using TripDrop.Application.Users.Dto;

namespace TripDrop.Application.Users.Queries
{
    public record CheckUsernameAvailabilityQuery(string? Username) : IRequest<UsernameAvailabilityDto>;
}
