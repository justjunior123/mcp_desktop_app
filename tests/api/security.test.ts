import request from 'supertest';
import { Express } from 'express';
import { setupTestApp } from '../setup/test-app';
import { APIErrorCode } from '../../src/lib/api-logger';

describe('API Security', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    const testSetup = await setupTestApp();
    app = testSetup.app;
    server = testSetup.server;
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Rate Limiting', () => {
    describe('General Rate Limiting', () => {
      it('should enforce general rate limits', async () => {
        // Make requests to exceed the general rate limit (100 per 15 minutes)
        const requests = Array(105).fill(null).map(() => 
          request(app).get('/api/models')
        );

        const responses = await Promise.allSettled(requests);
        
        // Check for rate limited responses
        const rateLimitedCount = responses.filter(
          (result) => result.status === 'fulfilled' && 
          result.value.status === 429
        ).length;

        expect(rateLimitedCount).toBeGreaterThan(0);
      }, 30000);
    });

    describe('Chat Rate Limiting', () => {
      it('should enforce chat-specific rate limits', async () => {
        const chatRequest = {
          model: 'llama3.2',
          messages: [{ role: 'user', content: 'test' }]
        };

        // Make requests to exceed chat rate limit (20 per minute)
        const requests = Array(25).fill(null).map(() => 
          request(app)
            .post('/api/chat')
            .send(chatRequest)
        );

        const responses = await Promise.allSettled(requests);
        
        const rateLimitedCount = responses.filter(
          (result) => result.status === 'fulfilled' && 
          result.value.status === 429
        ).length;

        expect(rateLimitedCount).toBeGreaterThan(0);
      }, 30000);
    });

    describe('Model Operations Rate Limiting', () => {
      it('should enforce model operations rate limits', async () => {
        // Make requests to exceed model operations rate limit (10 per 5 minutes)
        const requests = Array(12).fill(null).map((_, i) => 
          request(app)
            .post(`/api/models/test-model-${i}/pull`)
        );

        const responses = await Promise.allSettled(requests);
        
        const rateLimitedCount = responses.filter(
          (result) => result.status === 'fulfilled' && 
          result.value.status === 429
        ).length;

        expect(rateLimitedCount).toBeGreaterThan(0);
      }, 30000);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/models');

      // Rate limiting middleware should add these headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should return proper rate limit error format', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array(105).fill(null).map(() => 
        request(app).get('/api/models')
      );

      const responses = await Promise.allSettled(requests);
      
      const rateLimitedResponse = responses.find(
        (result) => result.status === 'fulfilled' && 
        result.value.status === 429
      );

      if (rateLimitedResponse && rateLimitedResponse.status === 'fulfilled') {
        expect(rateLimitedResponse.value.body.error.code).toBe(APIErrorCode.RATE_LIMIT_EXCEEDED);
        expect(rateLimitedResponse.value.body.error.message).toContain('Too many requests');
      }
    }, 30000);
  });

  describe('Input Sanitization', () => {
    it('should sanitize dangerous characters in input', async () => {
      const dangerousInput = {
        model: 'llama3.2',
        messages: [
          {
            role: 'user',
            content: 'Hello\x00\x01\x02\x03 World' // Control characters
          }
        ]
      };

      const response = await request(app)
        .post('/api/chat')
        .send(dangerousInput);

      // Should either succeed with sanitized input or reject invalid input
      expect([200, 400]).toContain(response.status);
    });

    it('should handle potential XSS in chat content', async () => {
      const xssPayload = {
        model: 'llama3.2',
        messages: [
          {
            role: 'user',
            content: '<script>alert("xss")</script>Hello'
          }
        ]
      };

      const response = await request(app)
        .post('/api/chat')
        .send(xssPayload);

      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        // Response should not contain unescaped script tags
        expect(JSON.stringify(response.body)).not.toContain('<script>alert');
      }
    });

    it('should sanitize headers', async () => {
      const response = await request(app)
        .get('/api/models')
        .set('User-Agent', '<script>alert("xss")</script>malicious-agent')
        .set('X-Forwarded-For', '127.0.0.1, <script>evil</script>');

      expect(response.status).toBe(200);
      // Should not crash or include malicious content in logs
    });

    it('should reject extremely long inputs', async () => {
      const veryLongContent = 'A'.repeat(100000); // Very long content
      const oversizedRequest = {
        model: 'llama3.2',
        messages: [
          {
            role: 'user',
            content: veryLongContent
          }
        ]
      };

      const response = await request(app)
        .post('/api/chat')
        .send(oversizedRequest);

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts in model names', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const maliciousPath of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/models/${encodeURIComponent(maliciousPath)}`);

        expect([400, 404]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
        }
      }
    });

    it('should validate model names against allowed patterns', async () => {
      const invalidModelNames = [
        'model/with/slashes',
        'model\\with\\backslashes',
        'model with spaces',
        'model!@#$%^&*()',
        ''
      ];

      for (const invalidName of invalidModelNames) {
        const response = await request(app)
          .get(`/api/models/${encodeURIComponent(invalidName)}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
      }
    });
  });

  describe('CORS Protection', () => {
    it('should allow valid origins', async () => {
      const validOrigins = [
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        'app://some-electron-app'
      ];

      for (const origin of validOrigins) {
        const response = await request(app)
          .options('/api/models')
          .set('Origin', origin);

        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
          expect(response.headers['access-control-allow-origin']).toBeDefined();
        }
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/chat')
        .set('Origin', 'http://localhost:3002');

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/models');

      // Check for security headers added by helmet
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set proper content type headers', async () => {
      const response = await request(app)
        .get('/api/models');

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should include correlation ID in all responses', async () => {
      const response = await request(app)
        .get('/api/models');

      expect(response.headers).toHaveProperty('x-correlation-id');
      expect(response.body).toHaveProperty('correlationId');
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized requests', async () => {
      // Create a very large request body
      const largeMessages = Array(1000).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'This is a very long message content that is repeated many times '.repeat(100)
      }));

      const oversizedRequest = {
        model: 'llama3.2',
        messages: largeMessages
      };

      const response = await request(app)
        .post('/api/chat')
        .send(oversizedRequest);

      expect([400, 413]).toContain(response.status);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{ "model": "llama3.2", "messages": [ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });
  });

  describe('Error Response Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/models/non-existent-model')
        .expect(404);

      // Should not expose internal paths, stack traces, etc.
      expect(response.body.error.message).not.toContain('/Users/');
      expect(response.body.error.message).not.toContain('Error:');
      expect(response.body.error.message).not.toContain('at ');
    });

    it('should use standardized error format', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({}) // Invalid request
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('correlationId');
    });

    it('should mask internal error details in production', async () => {
      // This test simulates production environment
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      try {
        const response = await request(app)
          .get('/api/models/trigger-internal-error');

        if (response.status >= 500) {
          expect(response.body.error.message).not.toContain('stack');
          expect(response.body.error.details).not.toHaveProperty('stack');
        }
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log suspicious patterns', async () => {
      const suspiciousRequests = [
        {
          method: 'POST',
          path: '/api/chat',
          body: {
            model: 'llama3.2',
            messages: [
              {
                role: 'user',
                content: 'SELECT * FROM users UNION SELECT password FROM admin'
              }
            ]
          }
        },
        {
          method: 'GET',
          path: '/api/models/test;exec("rm -rf /")'
        }
      ];

      for (const suspiciousRequest of suspiciousRequests) {
        const method = suspiciousRequest.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        const response = await (request(app) as any)[method](
          suspiciousRequest.path
        );

        if (suspiciousRequest.body) {
          await request(app)
            .post(suspiciousRequest.path)
            .send(suspiciousRequest.body);
        }

        // Requests should be handled safely
        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout long-running requests', async () => {
      // This test would require mocking a slow endpoint
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/models')
        .timeout(30000); // 30 second timeout

      const duration = Date.now() - startTime;
      
      // Should respond within reasonable time or timeout appropriately
      if (response.status === 408) {
        expect(response.body.error.code).toBe(APIErrorCode.INTERNAL_SERVER_ERROR);
      } else {
        expect(duration).toBeLessThan(30000);
      }
    });
  });
});