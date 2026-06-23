using MediatR;
using TripDrop.Domain.Entities;
using TripDrop.Domain.Repositories;

namespace TripDrop.Application.Friendships.Queries
{
    public class SearchUsersQueryHandler : IRequestHandler<SearchUsersQuery, IEnumerable<User>>
    {
        private readonly IUserRepository _userRepository;

        public SearchUsersQueryHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<User>> Handle(SearchUsersQuery request, CancellationToken cancellationToken)
        {
            if (request.SearchTerm.Trim().Length < 3)
                return Enumerable.Empty<User>();

            return await _userRepository.SearchByUsernameAsync(
                request.SearchTerm.Trim(), request.CurrentUserId, cancellationToken);
        }
    }
}
