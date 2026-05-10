using MediatR;
using TripDrop.Domain.Repositories;
using Supabase.Gotrue;

namespace TripDrop.Application.Users.Commands
{
    public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Guid>
    {
        private readonly IUserRepository _userRepository;
        private readonly Supabase.Client _supabaseClient;

        public RegisterUserCommandHandler(IUserRepository userRepository, Supabase.Client supabaseClient)
        {
            _userRepository = userRepository;
            _supabaseClient = supabaseClient;
        }

        public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
        {
            var cleanEmail = request.Email?.Trim().ToLower();

            var existingUser = await _userRepository.GetByEmailAsync(cleanEmail, cancellationToken);
            if (existingUser != null)
            {
                throw new Exception("Email jest już zajęty.");
            }

            var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    { "username", request.Username }
                }
            };

            var session = await _supabaseClient.Auth.SignUp(cleanEmail, request.Password, options);

            if (session?.User?.Id == null)
            {
                throw new Exception("Błąd autoryzacji po stronie dostawcy tożsamości.");
            }

            var externalUserId = Guid.Parse(session.User.Id);

            var newUser = new Domain.Entities.User(externalUserId, cleanEmail, request.Username);

            await _userRepository.AddAsync(newUser, cancellationToken);
            await _userRepository.SaveChangesAsync(cancellationToken);

            return newUser.Id;
        }
    }
}
