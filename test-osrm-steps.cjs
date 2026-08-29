const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const startLon = -74.006, startLat = 40.7128; // NY
  const endLon = -73.935242, endLat = 40.730610; // Brooklyn
  const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.routes[0].legs[0].steps.slice(0,2), null, 2));
}
test();
