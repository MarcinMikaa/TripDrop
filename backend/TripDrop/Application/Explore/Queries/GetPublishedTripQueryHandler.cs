using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Explore.Dto;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Explore.Queries
{
    public class GetPublishedTripQueryHandler : IRequestHandler<GetPublishedTripQuery, PublishedTripDetailsDto>
    {
        private readonly IPublishedTripRepository _repository;

        public GetPublishedTripQueryHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<PublishedTripDetailsDto> Handle(GetPublishedTripQuery request, CancellationToken cancellationToken)
        {
            var publication = await _repository.GetByIdWithAuthorAsync(request.PublicationId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono trasy.");

            if (publication.Status == PublicationStatus.Withdrawn)
                throw new GoneException("Autor wycofał tę trasę.");

            var content = PublicationContentSerializer.Deserialize(publication.Content);
            var isMine = request.CurrentUserId == publication.AuthorId;

            return new PublishedTripDetailsDto(
                publication.Id,
                publication.Title,
                publication.Description,
                publication.Region,
                publication.Author.Username,
                publication.Tags,
                publication.Visibility.ToString().ToLowerInvariant(),
                publication.DayCount,
                publication.TravelMode,
                publication.TotalDistanceM,
                publication.TotalDurationS,
                publication.CopyCount,
                publication.PublishedAt,
                publication.UpdatedAt,
                isMine,
                isMine ? publication.SourceTripId : null,
                content.Days
                    .Select(day => new PublishedTripDayDto(
                        day.DayNumber,
                        day.DistanceM,
                        day.DurationS,
                        day.RouteGeometry,
                        day.Points
                            .Select(point => new PublishedTripPointDto(point.Name, point.Lat, point.Lng))
                            .ToList()))
                    .ToList());
        }
    }
}
