using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Trips
{
    // --- QUERIES (Odczyt) ---
    public record GetTripsQuery() : IRequest<IEnumerable<Trip>>;

    // --- COMMANDS (Zapis/Zmiana) ---
    public record CreateTripCommand(
        string Name,
        string Description,
        double Lat,
        double Lon,
        Guid OwnerId) : IRequest<Guid>;
    public record DeleteTripCommand(Guid Id) : IRequest<Unit>;

    // --- HANDLERS (Logika) ---
    public class TripHandlers :
        IRequestHandler<GetTripsQuery, IEnumerable<Trip>>,
        IRequestHandler<CreateTripCommand, Guid>,
        IRequestHandler<DeleteTripCommand, Unit>
    {
        private readonly ITripRepository _repository;

        public TripHandlers(ITripRepository repository) => _repository = repository;

        // Pobieranie
        public async Task<IEnumerable<Trip>> Handle(GetTripsQuery request, CancellationToken ct)
            => await _repository.GetAllAsync();

        // Dodawanie
        public async Task<Guid> Handle(CreateTripCommand request, CancellationToken ct)
        {
            var trip = new Trip(request.Name, request.Lat, request.Lon, request.OwnerId);
            await _repository.AddAsync(trip);
            return trip.Id;
        }

        // Usuwanie
        public async Task<Unit> Handle(DeleteTripCommand request, CancellationToken ct)
        {

            return Unit.Value;
        }
    }
}
