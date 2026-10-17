import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RoutingControl = ({ start, end }) => {
  const map = useMap();

  useEffect(() => {
    if (!start || !end) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[1], start[0]), // Leaflet uses [lat, lng], our GeoJSON is [lng, lat]
        L.latLng(end[1], end[0])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#d97706', weight: 4 }] // amber-600
      }
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, start, end]);

  return null;
};

const RoutingMap = ({ buyerLocation, artisanLocation }) => {
  if (!buyerLocation || !artisanLocation) {
    return <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Map unavailable (missing locations)</div>;
  }

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
      <MapContainer
        center={[buyerLocation[1], buyerLocation[0]]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RoutingControl start={buyerLocation} end={artisanLocation} />
      </MapContainer>
    </div>
  );
};

export default RoutingMap;
