using MediatR;
using Supabase.Gotrue.Exceptions;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Users.Queries
{
    public class LoginUserQueryHandler : IRequestHandler<LoginUserQuery, LoginResponse>
    {
        private readonly Supabase.Client _supabaseClient;
        private readonly IUserRepository _userRepository;

        public LoginUserQueryHandler(Supabase.Client supabaseClient, IUserRepository userRepository)
        {
            _supabaseClient = supabaseClient;
            _userRepository = userRepository;
        }

        public async Task<LoginResponse> Handle(LoginUserQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var cleanEmail = request.Email?.Trim().ToLower();

                var session = await _supabaseClient.Auth.SignIn(cleanEmail, request.Password);

                if (session?.AccessToken == null)
                {
                    throw new Exception("Nie udało się pobrać tokena od dostawcy tożsamości.");
                }

                var user = await _userRepository.GetByEmailAsync(cleanEmail, cancellationToken);

                if (user is null)
                    throw new Exception("Konto istnieje w systemie uwierzytelniania, ale brak profilu użytkownika.");

                return new LoginResponse(session.AccessToken, user.Username);
            }
            catch (GotrueException)
            {
                throw new Exception("Nieprawidłowy email lub hasło.");
            }
        }
    }
}
