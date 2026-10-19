using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Publications.Queries
{
    public class GetTripPublicationQueryHandler : IRequestHandler<GetTripPublicationQuery, TripPublicationDto?>
    {
        private readonly IPublishedTripRepository _repository;

        public GetTripPublicationQueryHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<TripPublicationDto?> Handle(GetTripPublicationQuery request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetSourceTripAsync(request.TripId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono wycieczki.");

            if (trip.OwnerId != request.UserId)
                throw new ForbiddenAccessException("Tylko właściciel może zarządzać publikacją.");

            var publication = await _repository.GetBySourceTripIdAsync(trip.Id, cancellationToken);
            if (publication is null) return null;

            var content = PublicationContentSerializer.Deserialize(publication.Content);
            return TripPublicationMapper.ToDto(publication, content);
        }
    }
}
