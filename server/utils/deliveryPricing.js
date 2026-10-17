const getDistanceKm = (first, second) => {
  const toRadians = degrees => degrees * Math.PI / 180;
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;
  const latitudeDifference = toRadians(secondLatitude - firstLatitude);
  const longitudeDifference = toRadians(secondLongitude - firstLongitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(firstLatitude)) * Math.cos(toRadians(secondLatitude)) *
    Math.sin(longitudeDifference / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371 * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
};

const calculateDeliveryFee = (baseFee, perKmRate, distanceKm) =>
  Math.round((baseFee + perKmRate * distanceKm) * 100) / 100;

module.exports = { calculateDeliveryFee, getDistanceKm };
