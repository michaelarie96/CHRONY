// for this to work localhost:3000 & frontend localhost needs to be up and running
import { useEffect } from 'react';

function TestPing() {
  useEffect(() => {
    fetch('/api/ping')
      .then(res => res.json())
      .then(data => console.log('Response from backend:', data));
  }, []);

  return (
    <div style={{ padding: '1rem', backgroundColor: '#eee', marginBottom: '1rem' }}>
      <strong>Testing Ping to Backend...</strong>
    </div>
  );
}

export default TestPing;