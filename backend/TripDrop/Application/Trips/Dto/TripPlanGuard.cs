using TripDrop.Application.Common.Exceptions;
using TripDrop.Domain.Entities;

namespace TripDrop.Application.Trips
{
    public static class TripPlanGuard
    {
        public const string PointsLockedMessage =
            "Plan jest zamknięty. Właściciel musi wznowić planowanie, żeby zmieniać punkty.";

        public const string DatesLockedMessage =
            "Plan jest zamknięty. Wznów planowanie, żeby zmienić daty wycieczki.";

        public static void EnsurePointsEditable(Trip trip)
        {
            if (trip.IsPlanLocked)
                throw new ConflictException(PointsLockedMessage);
        }
    }
}
