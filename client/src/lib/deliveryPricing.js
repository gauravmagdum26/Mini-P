export const getDistanceKm = (first, second) => {
  const toRadians = degrees => degrees * Math.PI / 180;
  const latitudeDifference = toRadians(second[1] - first[1]);
  const longitudeDifference = toRadians(second[0] - first[0]);
  const haversine = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(first[1])) * Math.cos(toRadians(second[1])) *
    Math.sin(longitudeDifference / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371 * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
};

export const calculateDeliveryFee = (baseFee, perKmRate, distanceKm) =>
  Math.round((baseFee + perKmRate * distanceKm) * 100) / 100;
