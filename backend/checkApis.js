import http from 'http';

function fetchPath(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const health = await fetchPath('/api/health');
    console.log('HEALTH', health.status, health.body);

    const constituencies = await fetchPath('/api/constituencies');
    console.log('CONSTITUENCIES', constituencies.status);
    try {
      const parsed = JSON.parse(constituencies.body);
      console.log('Found', parsed.length, 'constituencies');
      console.log(JSON.stringify(parsed.slice(0, 5), null, 2));
    } catch (e) {
      console.log('Could not parse constituencies response body');
      console.log(constituencies.body);
    }
  } catch (err) {
    console.error('API check failed:', err.message || err);
    process.exitCode = 1;
  }
})();