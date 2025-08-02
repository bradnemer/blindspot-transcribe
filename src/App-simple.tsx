import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎙️ Podcast Manager</h1>
      <p>Welcome to the Podcast Manager application!</p>
      
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>System Status</h2>
        <p>✅ React Frontend: Running</p>
        <p>🔄 API Server: Checking...</p>
      </div>
      
      <div>
        <h3>Next Steps:</h3>
        <ol>
          <li>Verify API server is running on port 3001</li>
          <li>Test API connection</li>
          <li>Load full application features</li>
        </ol>
      </div>
    </div>
  );
}

export default App;