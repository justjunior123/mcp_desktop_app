import { test, expect } from '@playwright/test';
import type { Model } from '@prisma/client';

test.describe('API Integration Tests', () => {
  let testModel: Model | null = null;

  test.beforeEach(async ({ page }) => {
    // Ensure the app is running and accessible
    await page.goto('/');
  });

  test('health check endpoint returns correct status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('ollama');
  });

  test('can list models', async ({ request }) => {
    const response = await request.get('/api/models');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('models');
    expect(Array.isArray(data.models)).toBeTruthy();
  });

  test('can pull a new model', async ({ request }) => {
    const modelName = 'llama2';
    const response = await request.post('/api/models', {
      data: { modelName }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('model');
    expect(data.model).toHaveProperty('name', modelName);
    
    testModel = data.model;
  });

  test('can get model parameters', async ({ request }) => {
    test.skip(!testModel, 'No test model available');
    
    const response = await request.get(`/api/models/${testModel!.id}/parameters`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('parameters');
  });

  test('can update model parameters', async ({ request }) => {
    test.skip(!testModel, 'No test model available');
    
    const parameters = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 100
    };
    
    const response = await request.put(`/api/models/${testModel!.id}/parameters`, {
      data: { parameters }
    });
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('model');
    expect(data.model).toHaveProperty('parameters');
    
    const parsedParams = JSON.parse(data.model.parameters);
    expect(parsedParams).toMatchObject(parameters);
  });

  test('can delete a model', async ({ request }) => {
    test.skip(!testModel, 'No test model available');
    
    const response = await request.delete(`/api/models?modelId=${testModel!.id}`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    
    // Verify model is deleted
    const checkResponse = await request.get('/api/models');
    const checkData = await checkResponse.json();
    expect(checkData.models.find((m: Model) => m.id === testModel!.id)).toBeFalsy();
  });
}); 