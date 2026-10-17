import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DeliveryOrderMap = ({ coordinates }) => {
  const position = [coordinates[1], coordinates[0]];

  return (
    <div className="mt-3 h-64 w-full overflow-hidden rounded-md border border-gray-200">
      <MapContainer
        center={position}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: 256, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={position}
          radius={9}
          pathOptions={{ color: '#b45309', fillColor: '#f59e0b', fillOpacity: 0.9 }}
        >
          <Popup>Customer delivery location</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
};

export default DeliveryOrderMap;
