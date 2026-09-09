using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using TripDrop.Application.Common;

namespace TripDrop.Infrastructure.Realtime
{
    public class RealtimeNotifier : IRealtimeNotifier
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<RealtimeNotifier> _logger;
        private readonly string _supabaseUrl;
        private readonly string _serviceKey;

        public RealtimeNotifier(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<RealtimeNotifier> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _supabaseUrl = configuration["Supabase:Url"]!;
            _serviceKey = configuration["Supabase:ServiceRoleKey"]!;
        }

        public Task NotifyTripPointsChangedAsync(Guid tripId, CancellationToken cancellationToken)
        => BroadcastAsync($"trip:{tripId}", "points_changed", new { tripId }, cancellationToken);

        public Task NotifyFriendRequestsChangedAsync(Guid userId, CancellationToken cancellationToken)
            => BroadcastAsync($"user:{userId}", "friend_requests_changed", new { userId }, cancellationToken);

        private async Task BroadcastAsync(string topic, string eventName, object data, CancellationToken cancellationToken)
        {
            var payload = new
            {
                messages = new[]
                {
                new { topic, @event = eventName, payload = data }
            }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_supabaseUrl}/realtime/v1/api/broadcast")
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Add("apikey", _serviceKey);
            request.Headers.Add("Authorization", $"Bearer {_serviceKey}");

            try
            {
                var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("Broadcast nieudany: {Status} {Body}", response.StatusCode, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Nie udało się wysłać powiadomienia realtime na temat {Topic}", topic);
            }
        }
    }
}
