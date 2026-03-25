'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function TestMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    setStatus('Attempting to load Leaflet...');

    if (typeof window === 'undefined') {
      setStatus('❌ Not running in browser');
      return;
    }

    try {
      // Try to require Leaflet
      const L = require('leaflet');
      setStatus(`✓ Leaflet loaded: ${L.version}`);

      // Try to access CSS
      try {
        require('leaflet/dist/leaflet.css');
        setStatus(prev => prev + ' | ✓ CSS loaded');
      } catch (cssErr) {
        setStatus(prev => prev + ' | ✗ CSS error');
        console.error('CSS load error:', cssErr);
      }

      // Try to create map
      if (mapRef.current && mapRef.current.offsetHeight > 0) {
        try {
          const map = L.map(mapRef.current, {
            center: [20, 77],
            zoom: 5,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
          }).addTo(map);

          setStatus(prev => prev + ' | ✓ Map initialized');
          console.log('✅ Map fully initialized');
        } catch (mapErr) {
          setStatus(prev => prev + ' | ✗ Map init failed');
          console.error('Map init error:', mapErr);
        }
      } else {
        setStatus(prev => prev + ' | ✗ Container not ready');
      }
    } catch (err) {
      setStatus(`❌ Leaflet load failed: ${err}`);
      console.error('Leaflet error:', err);
    }
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>🗺️ Map Test Page</h1>
      <div style={{
        padding: '12px',
        marginBottom: '20px',
        backgroundColor: '#e3f2fd',
        border: '1px solid #90caf9',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
      }}>
        Status: {status}
      </div>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '500px',
          border: '2px solid #ccc',
          borderRadius: '8px',
          backgroundColor: '#f0f0f0',
        }}
      />
      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
        <h3>Debug Info:</h3>
        <p>If map appears below and status shows ✓, Leaflet is working fine.</p>
        <p>If you see ✗ error, check browser console (F12) for detailed error messages.</p>
        <p><a href="/train/01211">← Back to train page</a></p>
      </div>
    </div>
  );
}
