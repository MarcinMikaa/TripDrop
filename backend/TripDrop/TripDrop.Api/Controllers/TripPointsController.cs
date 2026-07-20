using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TripDrop.Application.TripPoints.Commands;
using TripDrop.Application.TripPoints.Queries;

namespace TripDrop.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/trips/{tripId:guid}/points")]
    public class TripPointsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TripPointsController(IMediator mediator) => _mediator = mediator;

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
                throw new UnauthorizedAccessException("Nieprawidłowy token.");
            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetByTrip(Guid tripId, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var points = await _mediator.Send(new GetTripPointsByTripQuery(tripId, userId), cancellationToken);
                return Ok(points);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create(Guid tripId, [FromBody] CreateTripPointDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var command = new CreateTripPointCommand(
                    tripId,
                    userId,
                    dto.Name,
                    dto.Latitude,
                    dto.Longitude,
                    dto.DayIndex
                );
                var created = await _mediator.Send(command, cancellationToken);
                return CreatedAtAction(nameof(GetByTrip), new { tripId }, created);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpPut("{pointId:guid}")]
        public async Task<IActionResult> Update(
            Guid tripId,
            Guid pointId,
            [FromBody] UpdateTripPointDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _mediator.Send(new UpdateTripPointCommand(
                    pointId,
                    userId,
                    dto.Name,
                    dto.DayIndex,
                    dto.Position
                ), cancellationToken);
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpDelete("{pointId:guid}")]
        public async Task<IActionResult> Delete(Guid tripId, Guid pointId, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _mediator.Send(new DeleteTripPointCommand(pointId, userId), cancellationToken);
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }

    public record CreateTripPointDto(
        string Name,
        double Latitude,
        double Longitude,
        int? DayIndex
    );

    public record UpdateTripPointDto(
        string Name,
        int? DayIndex,
        int Position
    );
}