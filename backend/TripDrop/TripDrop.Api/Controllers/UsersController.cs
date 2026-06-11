using MediatR;
using Microsoft.AspNetCore.Mvc;
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
        {
            try
            {
                var userId = await _mediator.Send(command);

                return Ok(new { UserId = userId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginUserQuery query)
        {
            try
            {
                var result = await _mediator.Send(query);
                return Ok(new
                {
                    token = result.Token,
                    user = new
                    {
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
