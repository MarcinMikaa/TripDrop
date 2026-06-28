using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TripDrop.Application.Trips.Commands;
using TripDrop.Application.Trips.Queries;

namespace TripDrop.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public TripsController(IMediator mediator) => _mediator = mediator;

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
                throw new UnauthorizedAccessException("Nieprawidłowy token.");
            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var trips = await _mediator.Send(new GetTripsQuery(userId), cancellationToken);
            return Ok(trips);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var trip = await _mediator.Send(new GetTripByIdQuery(id, userId), cancellationToken);
                if (trip is null) return NotFound(new { Error = "Wycieczka nie istnieje." });
                return Ok(trip);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTripDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                var command = new CreateTripCommand(
                    dto.Name,
                    dto.Description,
                    dto.StartDate,
                    dto.EndDate,
                    userId,
                    dto.ParticipantIds ?? Enumerable.Empty<Guid>()
                );
                var tripId = await _mediator.Send(command, cancellationToken);
                return CreatedAtAction(nameof(GetById), new { id = tripId }, new { id = tripId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpPost("{id:guid}/participants")]
        public async Task<IActionResult> AddParticipant(Guid id, [FromBody] AddParticipantDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _mediator.Send(new AddTripParticipantCommand(id, dto.UserId, userId), cancellationToken);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _mediator.Send(new DeleteTripCommand(id, userId), cancellationToken);
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

    public record CreateTripDto(
        string Name,
        string? Description,
        DateTime? StartDate,
        DateTime? EndDate,
        IEnumerable<Guid>? ParticipantIds
    );

    public record AddParticipantDto(Guid UserId);
}