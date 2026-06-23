namespace Hrms.Application.Common.Interfaces;

public interface IGeofenceService
{
    /// <summary>คืน true ถ้าจุด (pointLat, pointLng) อยู่ภายใน radiusMeters จากจุดศูนย์กลาง</summary>
    bool IsWithinGeofence(
        double centerLat, double centerLng, int radiusMeters,
        double pointLat, double pointLng);

    /// <summary>คำนวณระยะทาง (เมตร) ระหว่างสองจุด ด้วย Haversine formula</summary>
    double DistanceInMeters(
        double lat1, double lng1,
        double lat2, double lng2);
}
