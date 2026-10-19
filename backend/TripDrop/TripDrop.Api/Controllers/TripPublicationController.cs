using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Publications.Commands;
using TripDrop.Application.Publications.Queries;

namespace TripDrop.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/trips/{tripId:guid}/publication")]
    public class TripPublicationController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TripPublicationController(IMediator mediator) => _mediator = mediator;

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
                throw new UnauthorizedAccessException("Nieprawidłowy token.");
            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> Get(Guid tripId, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var publication = await _mediator.Send(
                    new GetTripPublicationQuery(tripId, userId), cancellationToken);

                return publication is null ? NoContent() : Ok(publication);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ForbiddenAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Error = ex.Message });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
        }

        [HttpPut]
        public async Task<IActionResult> Publish(
            Guid tripId,
            [FromBody] PublishTripDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var command = new PublishTripCommand(
                    tripId,
                    userId,
                    dto.PointIds,
                    dto.Title,
                    dto.Description,
                    dto.Region,
                    dto.Tags,
                    dto.Visibility);

                var publication = await _mediator.Send(command, cancellationToken);
                return Ok(publication);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ForbiddenAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Error = ex.Message });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
            catch (RequestValidationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }

    public record PublishTripDto(
        List<Guid>? PointIds,
        string? Title,
        string? Description,
        string? Region,
        List<string>? Tags,
        string? Visibility
    );
}
