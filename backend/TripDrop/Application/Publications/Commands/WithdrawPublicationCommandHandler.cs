using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Publications.Dto;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Publications.Commands
{
    public class WithdrawPublicationCommandHandler : IRequestHandler<WithdrawPublicationCommand, TripPublicationDto>
    {
        private readonly IPublishedTripRepository _repository;

        public WithdrawPublicationCommandHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<TripPublicationDto> Handle(WithdrawPublicationCommand request, CancellationToken cancellationToken)
        {
            var trip = await _repository.GetSourceTripAsync(request.TripId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono wycieczki.");

            if (trip.OwnerId != request.UserId)
                throw new ForbiddenAccessException("Tylko właściciel może wycofać publikację.");

            var publication = await _repository.GetBySourceTripIdAsync(trip.Id, cancellationToken)
                ?? throw new NotFoundException("Ta wycieczka nie jest opublikowana.");

            publication.Withdraw();
            await _repository.SaveChangesAsync(cancellationToken);

            var content = PublicationContentSerializer.Deserialize(publication.Content);
            return TripPublicationMapper.ToDto(publication, content);
        }
    }
}
