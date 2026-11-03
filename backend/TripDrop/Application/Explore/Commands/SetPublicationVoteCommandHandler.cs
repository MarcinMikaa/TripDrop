using MediatR;
using TripDrop.Application.Common.Exceptions;
using TripDrop.Application.Explore.Dto;
using TripDrop.Domain.Enums;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Explore.Commands
{
    public class SetPublicationVoteCommandHandler : IRequestHandler<SetPublicationVoteCommand, PublicationVoteDto>
    {
        private readonly IPublishedTripRepository _repository;

        public SetPublicationVoteCommandHandler(IPublishedTripRepository repository)
        {
            _repository = repository;
        }

        public async Task<PublicationVoteDto> Handle(SetPublicationVoteCommand request, CancellationToken cancellationToken)
        {
            var status = await _repository.GetStatusAsync(request.PublicationId, cancellationToken)
                ?? throw new NotFoundException("Nie znaleziono trasy.");

            if (status == PublicationStatus.Withdrawn)
                throw new GoneException("Autor wycofał tę trasę.");

            var voteCount = await _repository.SetVoteAsync(
                request.PublicationId, request.UserId, request.Voted, cancellationToken);

            return new PublicationVoteDto(voteCount, request.Voted);
        }
    }
}
