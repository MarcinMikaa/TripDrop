using MediatR;
using TripDrop.Application.Users.Dto;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Users.Queries
{
    public class CheckUsernameAvailabilityQueryHandler : IRequestHandler<CheckUsernameAvailabilityQuery, UsernameAvailabilityDto>
    {
        private readonly IUserRepository _userRepository;

        public CheckUsernameAvailabilityQueryHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UsernameAvailabilityDto> Handle(CheckUsernameAvailabilityQuery request, CancellationToken cancellationToken)
        {
            var username = UserRules.NormalizeUsername(request.Username);

            if (UserRules.ValidateUsername(username) is not null)
                return new UsernameAvailabilityDto(false);

            var taken = await _userRepository.UsernameExistsAsync(username, cancellationToken);
            return new UsernameAvailabilityDto(!taken);
        }
    }
}
