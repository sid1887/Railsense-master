'use client';

import { useEffect } from 'react';

export default function DocsPage() {
  useEffect(() => {
    // Load Swagger UI dynamically
    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/swagger-ui-dist@3/swagger-ui-bundle.js';
    script1.async = true;
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://unpkg.com/swagger-ui-dist@3/swagger-ui-standalone-preset.js';
      script2.async = true;
      script2.onload = () => {
        (window as any).SwaggerUIBundle({
          url: '/api/docs/openapi',
          dom_id: '#swagger-ui',
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIStandalonePreset
          ],
          layout: 'BaseLayout',
          deepLinking: true,
          defaultModelsExpandDepth: 1,
          docExpansion: 'list'
        });
      };
      document.body.appendChild(script2);
    };
    document.body.appendChild(script1);

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@3/swagger-ui.css';
    document.head.appendChild(link);

    return () => {
      // Cleanup
      const uiDiv = document.getElementById('swagger-ui');
      if (uiDiv) {
        uiDiv.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-2xl font-bold">🚂 RailSense API Documentation</h1>
        <div className="text-sm text-gray-300">v1.0.0 | Railway Intelligence Platform</div>
      </div>
      <div id="swagger-ui"></div>
    </div>
  );
}
