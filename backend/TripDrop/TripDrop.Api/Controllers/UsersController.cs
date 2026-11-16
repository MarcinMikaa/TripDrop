using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripDrop.Api.Infrastructure;
using TripDrop.Application.Users.Commands;
using TripDrop.Application.Users.Queries;

namespace TripDrop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public UsersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserCommand command, CancellationToken cancellationToken)
        {
            var userId = await _mediator.Send(command, cancellationToken);
            return Ok(new { UserId = userId });
        }

        [AllowAnonymous]
        [HttpGet("username-available")]
        [EnableRateLimiting(RateLimitPolicies.UsernameCheck)]
        public async Task<IActionResult> UsernameAvailable([FromQuery] string? username, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(new CheckUsernameAvailabilityQuery(username), cancellationToken);
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginUserQuery query)
        {
            try
            {
                var result = await _mediator.Send(query);
                return Ok(new
                {
                    token = result.Token,
                    supabaseToken = result.SupabaseToken,
                    user = new
                    {
                        id = result.UserId,
                        username = result.Username
                    }
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { Error = ex.Message });
            }
        }
    }
}