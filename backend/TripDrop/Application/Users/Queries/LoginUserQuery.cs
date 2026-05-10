using MediatR;

namespace TripDrop.Application.Users.Queries
{
    public record LoginUserQuery(string Email, string Password) : IRequest<LoginResponse>;
}
