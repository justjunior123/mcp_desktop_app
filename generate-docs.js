const fs = require('fs');

// Copy the HTML generation function
const generateApiDocsHtml = () => {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Desktop API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #1f2937;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info .title {
      color: #1f2937;
    }
    .swagger-ui .scheme-container {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
    .api-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .api-info h1 {
      margin: 0 0 10px 0;
      font-size: 2.5em;
    }
    .api-info p {
      margin: 5px 0;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      // Load spec from the server
      fetch('http://localhost:3100/api/docs/spec')
        .then(response => response.json())
        .then(spec => {
          const ui = SwaggerUIBundle({
            spec: spec,
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            defaultModelsExpandDepth: 1,
            defaultModelExpandDepth: 1,
            displayRequestDuration: true,
            tryItOutEnabled: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            validatorUrl: null,
            docExpansion: 'list',
            operationsSorter: 'alpha',
            tagsSorter: 'alpha'
          });
          
          // Add custom header
          setTimeout(() => {
            const infoSection = document.querySelector('.swagger-ui .info');
            if (infoSection && !document.querySelector('.api-info')) {
              const header = document.createElement('div');
              header.className = 'api-info';
              header.innerHTML = \`
                <h1>🚀 MCP Desktop API</h1>
                <p><strong>Base URL:</strong> http://localhost:3100</p>
                <p><strong>Version:</strong> 1.0.0</p>
                <p><strong>Status:</strong> Development</p>
              \`;
              infoSection.parentNode.insertBefore(header, infoSection);
            }
          }, 500);
        })
        .catch(error => {
          document.getElementById('swagger-ui').innerHTML = \`
            <div style="padding: 20px; text-align: center;">
              <h2>⚠️ Unable to load API specification</h2>
              <p>Make sure your development server is running on http://localhost:3100</p>
              <p>Run: <code>npm run dev</code></p>
              <p>Error: \${error.message}</p>
            </div>
          \`;
        });
    };
  </script>
</body>
</html>
  `;
};

// Generate the HTML file
fs.writeFileSync('api-docs.html', generateApiDocsHtml());
console.log('✅ Generated api-docs.html');
console.log('📖 To view: Start your dev server (npm run dev) then open api-docs.html in your browser');
console.log('🌐 Or directly visit: http://localhost:3100/api/docs');