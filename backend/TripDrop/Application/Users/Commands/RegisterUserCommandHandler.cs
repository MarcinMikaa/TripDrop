using MediatR;
using Supabase.Gotrue;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Domain.Repositories;

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
            var email = UserRules.NormalizeEmail(request.Email);
            var username = UserRules.NormalizeUsername(request.Username);

            var validationError = UserRules.ValidateEmail(email)
                ?? UserRules.ValidateUsername(username)
                ?? UserRules.ValidatePassword(request.Password);

            if (validationError is not null)
                throw new RequestValidationException(validationError);

            if (await _userRepository.GetByEmailAsync(email, cancellationToken) is not null)
                throw new ConflictException("Ten e-mail jest już zajęty.");

            if (await _userRepository.UsernameExistsAsync(username, cancellationToken))
                throw new ConflictException("Ta nazwa użytkownika jest już zajęta.");

            var externalUserId = await SignUpAsync(email, username, request.Password);

            var newUser = new Domain.Entities.User(externalUserId, email, username);

            await _userRepository.AddAsync(newUser, CancellationToken.None);
            await _userRepository.SaveChangesAsync(CancellationToken.None);

            return newUser.Id;
        }

        private async Task<Guid> SignUpAsync(string email, string username, string password)
        {
            var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    { "username", username }
                }
            };

            string? externalId;
            try
            {
                var session = await _supabaseClient.Auth.SignUp(email, password, options);
                externalId = session?.User?.Id;
            }
            catch (Exception ex)
            {
                throw MapSignUpError(ex);
            }

            if (!Guid.TryParse(externalId, out var userId))
                throw new RequestValidationException("Nie udało się założyć konta. Spróbuj ponownie.");

            return userId;
        }

        private static Exception MapSignUpError(Exception ex)
        {
            var message = ex.Message;

            if (message.Contains("already registered", StringComparison.OrdinalIgnoreCase))
                return new ConflictException("Ten e-mail jest już zajęty.");

            if (message.Contains("rate limit", StringComparison.OrdinalIgnoreCase)
                || message.Contains("security purposes", StringComparison.OrdinalIgnoreCase))
                return new RequestValidationException("Za dużo prób rejestracji. Spróbuj ponownie za kilka minut.");

            if (message.Contains("password", StringComparison.OrdinalIgnoreCase))
                return new RequestValidationException("Hasło nie spełnia wymagań. Użyj co najmniej 8 znaków, wielkiej litery i cyfry.");

            return new RequestValidationException("Nie udało się założyć konta. Spróbuj ponownie.");
        }
    }
}
