using Hrms.Application.Common.Interfaces;

namespace Hrms.Infrastructure.Services;

public class GeofenceService : IGeofenceService
{
    private const double EarthRadiusMeters = 6_371_000;

    public double DistanceInMeters(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return EarthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public bool IsWithinGeofence(
        double centerLat, double centerLng, int radiusMeters,
        double pointLat, double pointLng)
        => DistanceInMeters(centerLat, centerLng, pointLat, pointLng) <= radiusMeters;

    private static double ToRad(double deg) => deg * Math.PI / 180;
}
