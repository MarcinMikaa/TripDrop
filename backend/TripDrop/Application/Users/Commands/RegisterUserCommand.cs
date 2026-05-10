using MediatR;

namespace TripDrop.Application.Users.Commands
{
    public record RegisterUserCommand(string Email, string Username, string Password): IRequest<Guid>;
}
