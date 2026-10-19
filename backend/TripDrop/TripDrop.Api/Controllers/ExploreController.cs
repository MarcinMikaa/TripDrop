using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Explore.Commands;
using TripDrop.Application.Explore.Queries;

namespace TripDrop.Api.Controllers
{
    [ApiController]
    [Route("api/explore/trips")]
    public class ExploreController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ExploreController(IMediator mediator) => _mediator = mediator;

        private Guid? TryGetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var userId) ? userId : null;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] string? search,
            [FromQuery] string? tags,
            [FromQuery] int? minDays,
            [FromQuery] int? maxDays,
            [FromQuery] string? sort,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 24,
            CancellationToken cancellationToken = default)
        {
            var tagList = string.IsNullOrWhiteSpace(tags)
                ? Array.Empty<string>()
                : tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var page = await _mediator.Send(
                new GetPublishedTripsQuery(search, tagList, minDays, maxDays, sort, skip, take),
                cancellationToken);

            return Ok(page);
        }

        [AllowAnonymous]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var details = await _mediator.Send(
                    new GetPublishedTripQuery(id, TryGetCurrentUserId()),
                    cancellationToken);

                return Ok(details);
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
            catch (GoneException ex)
            {
                return StatusCode(StatusCodes.Status410Gone, new { Error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("{id:guid}/copy")]
        public async Task<IActionResult> Copy(
            Guid id,
            [FromBody] CopyPublishedTripDto dto,
            CancellationToken cancellationToken)
        {
            var userId = TryGetCurrentUserId();
            if (userId is null) return Forbid();

            try
            {
                var tripId = await _mediator.Send(
                    new CopyPublishedTripCommand(id, userId.Value, dto.Name, dto.StartDate),
                    cancellationToken);

                return Created($"/api/trips/{tripId}", new { TripId = tripId });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
            catch (GoneException ex)
            {
                return StatusCode(StatusCodes.Status410Gone, new { Error = ex.Message });
            }
            catch (RequestValidationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }

    public record CopyPublishedTripDto(string? Name, DateTime? StartDate);
}
