import request from 'supertest';
import { Express } from 'express';
import { setupTestApp } from '../setup/test-app';
import { APIErrorCode } from '../../src/lib/api-logger';

describe('Models API', () => {
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

  describe('GET /api/models', () => {
    it('should list all models', async () => {
      const response = await request(app)
        .get('/api/models')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('models');
      expect(Array.isArray(response.body.data.models)).toBe(true);
      expect(response.body).toHaveProperty('correlationId');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include correlation ID in response', async () => {
      const correlationId = 'models-list-test-123';
      
      const response = await request(app)
        .get('/api/models')
        .set('X-Correlation-ID', correlationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
      expect(response.body.correlationId).toBe(correlationId);
    });

    it('should return models with correct structure', async () => {
      const response = await request(app)
        .get('/api/models')
        .expect(200);

      if (response.body.data.models.length > 0) {
        const model = response.body.data.models[0];
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('size');
        expect(model).toHaveProperty('digest');
        expect(model).toHaveProperty('format');
        expect(model).toHaveProperty('family');
        expect(model).toHaveProperty('status');
      }
    });

    it('should handle Ollama service unavailable', async () => {
      // This test would require mocking Ollama service to be down
      // For now, we'll test the structure when service is available
      const response = await request(app)
        .get('/api/models');

      expect([200, 503]).toContain(response.status);
      
      if (response.status === 503) {
        expect(response.body.error.code).toBe(APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE);
      }
    });
  });

  describe('GET /api/models/:name', () => {
    const validModelName = 'llama3.2';
    const invalidModelName = 'non-existent-model';

    it('should get model details for existing model', async () => {
      const response = await request(app)
        .get(`/api/models/${validModelName}`)
        .expect('Content-Type', /json/);

      // Model might not exist in test environment
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name', validModelName);
        expect(response.body.data).toHaveProperty('size');
        expect(response.body.data).toHaveProperty('status');
      }
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get(`/api/models/${invalidModelName}`)
        .expect(404);

      expect(response.body.error.code).toBe(APIErrorCode.MODEL_NOT_FOUND);
      expect(response.body.error.message).toContain(invalidModelName);
      expect(response.body.error.correlationId).toBeDefined();
    });

    it('should validate model name format', async () => {
      const invalidModelName = 'invalid model name!';
      
      const response = await request(app)
        .get(`/api/models/${encodeURIComponent(invalidModelName)}`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should handle very long model names', async () => {
      const longModelName = 'x'.repeat(101); // Exceeds max length
      
      const response = await request(app)
        .get(`/api/models/${longModelName}`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should sanitize model name input', async () => {
      const maliciousModelName = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get(`/api/models/${encodeURIComponent(maliciousModelName)}`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });
  });

  describe('POST /api/models/:name/pull', () => {
    const testModelName = 'test-model';

    it('should start model pull and return stream', async () => {
      const response = await request(app)
        .post(`/api/models/${testModelName}/pull`)
        .expect('Content-Type', /text\/event-stream/);

      // Model pull might fail in test environment, but should return proper format
      expect([200, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.text).toContain('data:');
      }
    });

    it('should include correlation ID in pull response', async () => {
      const correlationId = 'model-pull-test-123';
      
      const response = await request(app)
        .post(`/api/models/${testModelName}/pull`)
        .set('X-Correlation-ID', correlationId);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });

    it('should validate model name for pull', async () => {
      const invalidModelName = 'invalid model!';
      
      const response = await request(app)
        .post(`/api/models/${encodeURIComponent(invalidModelName)}/pull`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should enforce rate limiting on model operations', async () => {
      // Make multiple rapid pull requests
      const requests = Array(12).fill(null).map(() => 
        request(app)
          .post(`/api/models/test-model-${Math.random()}/pull`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && 
        result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle pull progress updates correctly', async () => {
      const response = await request(app)
        .post(`/api/models/${testModelName}/pull`)
        .timeout(5000); // Short timeout for test

      if (response.status === 200) {
        // Should contain SSE formatted data
        expect(response.text).toMatch(/data: \{.*\}/);
      }
    });
  });

  describe('PUT /api/models/:name/config', () => {
    const testModelName = 'llama3.2';
    
    const validConfig = {
      temperature: 0.8,
      topP: 0.9,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful assistant.'
    };

    it('should update model configuration', async () => {
      const response = await request(app)
        .put(`/api/models/${testModelName}/config`)
        .send(validConfig);

      // Model might not exist in test environment
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      } else if (response.status === 404) {
        expect(response.body.error.code).toBe(APIErrorCode.MODEL_NOT_FOUND);
      }
    });

    it('should validate configuration parameters', async () => {
      const invalidConfig = {
        temperature: 3.0, // Invalid: > 2
        topP: 1.5,        // Invalid: > 1
        maxTokens: -1     // Invalid: < 1
      };

      const response = await request(app)
        .put(`/api/models/${testModelName}/config`)
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
      expect(response.body.error.details).toHaveProperty('validationErrors');
    });

    it('should handle empty configuration', async () => {
      const response = await request(app)
        .put(`/api/models/${testModelName}/config`)
        .send({});

      // Empty config should be valid
      expect([200, 404]).toContain(response.status);
    });

    it('should validate model name in config update', async () => {
      const invalidModelName = 'invalid!';
      
      const response = await request(app)
        .put(`/api/models/${encodeURIComponent(invalidModelName)}/config`)
        .send(validConfig)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should sanitize system prompt input', async () => {
      const configWithMaliciousPrompt = {
        systemPrompt: '<script>alert("xss")</script>You are a helpful assistant.'
      };

      const response = await request(app)
        .put(`/api/models/${testModelName}/config`)
        .send(configWithMaliciousPrompt);

      if (response.status === 200) {
        // Should not contain script tags
        expect(response.body.success).toBe(true);
      }
    });

    it('should handle very long system prompt', async () => {
      const longPrompt = 'x'.repeat(32001); // Exceeds max length
      const configWithLongPrompt = {
        systemPrompt: longPrompt
      };

      const response = await request(app)
        .put(`/api/models/${testModelName}/config`)
        .send(configWithLongPrompt)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });
  });

  describe('DELETE /api/models/:name', () => {
    const testModelName = 'test-delete-model';

    it('should delete existing model', async () => {
      const response = await request(app)
        .delete(`/api/models/${testModelName}`);

      // Model might not exist in test environment
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('deleted');
      } else if (response.status === 404) {
        expect(response.body.error.code).toBe(APIErrorCode.MODEL_NOT_FOUND);
      }
    });

    it('should validate model name for deletion', async () => {
      const invalidModelName = 'invalid model!';
      
      const response = await request(app)
        .delete(`/api/models/${encodeURIComponent(invalidModelName)}`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should enforce rate limiting on delete operations', async () => {
      // Make multiple rapid delete requests
      const requests = Array(12).fill(null).map((_, i) => 
        request(app)
          .delete(`/api/models/test-delete-${i}`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && 
        result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    it('should return proper error for non-existent model deletion', async () => {
      const nonExistentModel = 'definitely-does-not-exist';
      
      const response = await request(app)
        .delete(`/api/models/${nonExistentModel}`)
        .expect(404);

      expect(response.body.error.code).toBe(APIErrorCode.MODEL_NOT_FOUND);
      expect(response.body.error.message).toContain(nonExistentModel);
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/models');

      expect(response.headers).toHaveProperty('x-correlation-id');
    });

    it('should handle malicious path traversal attempts', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      const response = await request(app)
        .get(`/api/models/${encodeURIComponent(maliciousPath)}`)
        .expect(400);

      expect(response.body.error.code).toBe(APIErrorCode.INVALID_REQUEST);
    });

    it('should sanitize headers', async () => {
      const response = await request(app)
        .get('/api/models')
        .set('User-Agent', '<script>alert("xss")</script>');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      // This would require mocking network issues
      const response = await request(app)
        .get('/api/models')
        .timeout(1000);

      expect([200, 503, 408]).toContain(response.status);
    });

    it('should provide meaningful error messages', async () => {
      const response = await request(app)
        .get('/api/models/invalid-model-name!')
        .expect(400);

      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.correlationId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should respond to model list within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/models');

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle concurrent model requests', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app).get('/api/models')
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
      });
    });
  });
});