
namespace TripDrop.Application.Users.Queries
{
    public record LoginResponse(Guid UserId, string Token, string Username, string SupabaseToken);
}
