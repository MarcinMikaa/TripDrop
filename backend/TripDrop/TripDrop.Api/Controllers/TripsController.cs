using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TripDrop.Domain.Entities;

namespace TripDrop.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripsController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetTrips()
        {
            var mockTrips = new List<Trip>
            {
                new Trip("Wycieczka w góry", 49.299, 19.949, Guid.NewGuid()),
                new Trip("Wycieczka nad morze", 54.352, 18.646, Guid.NewGuid()),
            };
            return Ok(mockTrips);
        }
    }
}
