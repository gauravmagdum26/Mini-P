import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapClickHandler = ({ onChange }) => {
  useMapEvents({
    click: event => onChange([event.latlng.lng, event.latlng.lat]),
  });
  return null;
};

const RecenterMap = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (location) map.flyTo([location[1], location[0]], 16);
  }, [location, map]);

  return null;
};

const DeliveryLocationPicker = ({ location, artisanLocation, onChange }) => {
  const [pendingLocation, setPendingLocation] = useState(location);
  const [confirming, setConfirming] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('Click the map to choose a delivery point.');
  const initialCenter = artisanLocation
    ? [artisanLocation[1], artisanLocation[0]]
    : [20.5937, 78.9629];

  const confirmLocation = async (coordinates = pendingLocation) => {
    if (!coordinates) return;

    setConfirming(true);
    let addressFields = {};
    try {
      const [longitude, latitude] = coordinates;
      const query = new URLSearchParams({
        format: 'jsonv2',
        lat: latitude,
        lon: longitude,
        addressdetails: '1',
        zoom: '18',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
      if (!response.ok) throw new Error('Address lookup failed');

      const result = await response.json();
      const address = result.address || {};
      const postalCode = address.postcode?.match(/[0-9]{6}/)?.[0] || '';
      const street = [address.house_number, address.road || address.pedestrian || address.residential]
        .filter(Boolean)
        .join(' ') || address.suburb || address.neighbourhood || '';
      addressFields = {
        street,
        city: address.city || address.town || address.village || address.municipality || '',
        state: address.state || '',
        postalCode,
      };
      setMessage('Location selected. Review or edit the address below.');
    } catch {
      addressFields = { street: '', city: '', state: '', postalCode: '' };
      setMessage('Location selected. Enter or edit the address below.');
    } finally {
      onChange(coordinates, addressFields);
      setConfirming(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Location is unavailable in this browser. Choose a point on the map.');
      return;
    }

    setLocating(true);
    setMessage('Finding your current location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = [coords.longitude, coords.latitude];
        setPendingLocation(coordinates);
        setMessage('Current location found. Looking up the address...');
        setLocating(false);
        confirmLocation(coordinates);
      },
      () => {
        setMessage('Could not access your location. Allow location access or choose a point on the map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-gray-200" style={{ height: 320 }}>
        <MapContainer
          center={initialCenter}
          zoom={artisanLocation ? 13 : 5}
          style={{ height: 320, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap location={pendingLocation} />
          <MapClickHandler onChange={coordinates => {
            setPendingLocation(coordinates);
            setMessage('Confirm the pin to fill the address fields.');
          }} />
          {pendingLocation && (
            <Marker position={[pendingLocation[1], pendingLocation[0]]}>
              <Popup>Delivery point</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <p aria-live="polite" className="text-sm text-gray-600">
        {pendingLocation ? `${message} (${pendingLocation[1].toFixed(5)}, ${pendingLocation[0].toFixed(5)})` : message}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locating || confirming}
          onClick={useCurrentLocation}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LocateFixed className="h-4 w-4" />
          {locating ? 'Finding location...' : 'Use current location'}
        </button>
        <button
          type="button"
          disabled={!pendingLocation || confirming || locating}
          onClick={() => confirmLocation()}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirming ? 'Finding address...' : 'Use selected location'}
        </button>
      </div>
    </div>
  );
};

export default DeliveryLocationPicker;
