using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TripDrop.Application.Trips;
using TripDrop.Domain.Entities;

namespace TripDrop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly IMediator _mediator;
        public TripsController(IMediator mediator) => _mediator = mediator;

        [HttpGet]
        public async Task<IActionResult> GetAll()
            => Ok(await _mediator.Send(new GetTripsQuery()));

        [HttpPost]
        public async Task<IActionResult> Create(CreateTripCommand command)
            => Ok(await _mediator.Send(command));

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
            => Ok(await _mediator.Send(new DeleteTripCommand(id)));
    }
}
