const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 2000);
fetch("http://localhost:3000/api/link-preview?url=https://httpstat.us/200?sleep=5000", { signal: controller.signal })
  .then(res => { clearTimeout(timeoutId); return res.json(); })
  .then(data => console.log("Success", data))
  .catch(err => console.log("Caught:", err.message));
