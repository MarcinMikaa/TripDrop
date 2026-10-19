using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Explore.Commands
{
    public class CopyPublishedTripCommandHandler : IRequestHandler<CopyPublishedTripCommand, Guid>
    {
        private const int MaxNameLength = 200;
        private const int MinYear = 2000;
        private const int MaxYear = 2100;

        private readonly IPublishedTripRepository _repository;

        public CopyPublishedTripCommandHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<Guid> Handle(CopyPublishedTripCommand request, CancellationToken cancellationToken)
        {
            var publication = await _repository.GetByIdWithAuthorAsync(request.PublicationId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono trasy.");

            if (publication.Status == PublicationStatus.Withdrawn)
                throw new GoneException("Autor wycofał tę trasę, nie można jej już skopiować.");

            var name = string.IsNullOrWhiteSpace(request.Name) ? publication.Title : request.Name.Trim();
            if (name.Length > MaxNameLength)
                throw new RequestValidationException($"Nazwa może mieć najwyżej {MaxNameLength} znaków.");

            if (request.StartDate is null)
                throw new RequestValidationException("Wybierz datę rozpoczęcia wycieczki.");

            var startDate = request.StartDate.Value.Date;
            if (startDate.Year < MinYear || startDate.Year > MaxYear)
                throw new RequestValidationException("Nieprawidłowa data rozpoczęcia.");

            var endDate = startDate.AddDays(Math.Max(1, publication.DayCount) - 1);

            var content = PublicationContentSerializer.Deserialize(publication.Content);

            var trip = new Trip(name, request.UserId, publication.Description, startDate, endDate);
            trip.MarkAsCopiedFrom(publication.Id);

            var points = content.Days
                .SelectMany(day => day.Points.Select((point, index) => new TripPoint(
                    trip.Id,
                    request.UserId,
                    point.Name,
                    point.Lat,
                    point.Lng,
                    day.DayNumber - 1,
                    index)))
                .ToList();

            await _repository.SaveCopyAsync(trip, points, publication.Id, cancellationToken);

            return trip.Id;
        }
    }
}
