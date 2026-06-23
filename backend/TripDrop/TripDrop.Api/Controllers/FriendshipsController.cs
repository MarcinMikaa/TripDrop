using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TripDrop.Application.Friendships.Commands;
using TripDrop.Application.Friendships.Queries;

namespace TripDrop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FriendshipsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public FriendshipsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
                throw new UnauthorizedAccessException("Nieprawidłowy token.");
            return userId;
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string term, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(term) || term.Trim().Length < 3)
                return BadRequest(new { Error = "Wyszukiwana fraza musi mieć minimum 3 znaki." });
            var currentUserId = GetCurrentUserId();
            var users = await _mediator.Send(new SearchUsersQuery(term.Trim(), currentUserId), cancellationToken);

            return Ok(users.Select(u => new { u.Id, u.Username }));
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingRequests(CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var pending = await _mediator.Send(new GetPendingRequestsQuery(currentUserId), cancellationToken);

            return Ok(pending.Select(f => new
            {
                f.Id,
                Requester = new { f.Requester.Id, f.Requester.Username },
                f.CreatedAt
            }));
        }

        [HttpGet]
        public async Task<IActionResult> GetFriends(CancellationToken cancellationToken)
        {
            var currentUserId = GetCurrentUserId();
            var friends = await _mediator.Send(new GetFriendsQuery(currentUserId), cancellationToken);

            return Ok(friends.Select(f =>
            {
                // wyłączenie usera który jest teraz zalogowany
                var friend = f.RequesterId == currentUserId ? f.Addressee : f.Requester;
                return new { friend.Id, friend.Username };
            }));
        }

        [HttpPost("invite")]
        public async Task<IActionResult> SendInvite([FromBody] SendInviteDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var friendshipId = await _mediator.Send(
                    new SendFriendRequestCommand(currentUserId, dto.AddresseeId), cancellationToken);

                return Ok(new { FriendshipId = friendshipId });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpPost("{id:guid}/accept")]
        public async Task<IActionResult> Accept(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                await _mediator.Send(new AcceptFriendRequestCommand(id, currentUserId), cancellationToken);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpPost("{id:guid}/reject")]
        public async Task<IActionResult> Reject(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                await _mediator.Send(new RejectFriendRequestCommand(id, currentUserId), cancellationToken);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }
    public record SendInviteDto(Guid AddresseeId);
}
