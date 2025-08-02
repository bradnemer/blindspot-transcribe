import React, { useState, useEffect } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState('🔄 Checking...');

  useEffect(() => {
    // Test API connection with dynamic URL
    const testAPI = async () => {
      try {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const apiUrl = `${protocol}//${hostname}:3001/api/health`;
        
        console.log('Testing API at:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('API Response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          setApiStatus(`✅ Connected (${data.status})`);
          console.log('API Data:', data);
        } else {
          setApiStatus(`❌ API Error: ${response.status}`);
        }
      } catch (error) {
        console.error('API Connection Error:', error);
        setApiStatus(`❌ Connection failed: ${error.message}`);
      }
    };

    testAPI();
  }, []);

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
        <p>🌐 API Server: {apiStatus}</p>
      </div>
      
      <div>
        <h3>Access Points:</h3>
        <ul>
          <li>Frontend: <a href={`${window.location.protocol}//${window.location.hostname}:3000`} target="_blank">{`${window.location.protocol}//${window.location.hostname}:3000`}</a></li>
          <li>API Health: <a href={`${window.location.protocol}//${window.location.hostname}:3001/api/health`} target="_blank">{`${window.location.protocol}//${window.location.hostname}:3001/api/health`}</a></li>
        </ul>
      </div>
      
      <div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}

export default App;