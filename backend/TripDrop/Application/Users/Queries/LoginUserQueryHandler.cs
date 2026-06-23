using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Supabase.Gotrue.Exceptions;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Users.Queries
{
    public class LoginUserQueryHandler : IRequestHandler<LoginUserQuery, LoginResponse>
    {
        private readonly Supabase.Client _supabaseClient;
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public LoginUserQueryHandler(
            Supabase.Client supabaseClient,
            IUserRepository userRepository,
            IConfiguration configuration)
        {
            _supabaseClient = supabaseClient;
            _userRepository = userRepository;
            _configuration = configuration;
        }

        public async Task<LoginResponse> Handle(LoginUserQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var cleanEmail = request.Email?.Trim().ToLower();

                var session = await _supabaseClient.Auth.SignIn(cleanEmail, request.Password);
                if (session?.AccessToken == null)
                    throw new Exception("Nie udało się pobrać tokena od dostawcy tożsamości.");

                var user = await _userRepository.GetByEmailAsync(cleanEmail, cancellationToken);
                if (user is null)
                    throw new Exception("Konto istnieje w systemie uwierzytelniania, ale brak profilu użytkownika.");

                var token = GenerateJwt(user.Id, user.Email, user.Username);

                return new LoginResponse(token, user.Username);
            }
            catch (GotrueException)
            {
                throw new Exception("Nieprawidłowy email lub hasło.");
            }
        }

        private string GenerateJwt(Guid userId, string email, string username)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim("username", username),
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}