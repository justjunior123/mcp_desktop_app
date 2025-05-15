import { ModelController } from './ModelController';
import { ModelManager } from './ModelManager';

// Create a mock ModelManager
const mockModelManager = {
  listModelsWithDetails: jest.fn(),
  getModelWithDetails: jest.fn(),
  pullModel: jest.fn(),
  deleteModel: jest.fn(),
  saveModelParameters: jest.fn(),
  getModelParameters: jest.fn(),
  refreshModelStatuses: jest.fn(),
  on: jest.fn()
};

// Mock the Express router and route handlers
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Mock Express module
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter)
}));

describe('ModelController', () => {
  let controller: ModelController;
  
  beforeEach(() => {
    // Reset all mock functions
    jest.clearAllMocks();
    
    // Create a new controller instance for each test
    controller = new ModelController(mockModelManager as any);
  });
  
  it('should set up API routes correctly', () => {
    // Check if the correct route handlers were registered
    expect(mockRouter.get).toHaveBeenCalledWith('/models', expect.any(Function));
    expect(mockRouter.get).toHaveBeenCalledWith('/models/:id', expect.any(Function));
    expect(mockRouter.post).toHaveBeenCalledWith('/models/pull', expect.any(Function));
    expect(mockRouter.delete).toHaveBeenCalledWith('/models/:id', expect.any(Function));
    expect(mockRouter.put).toHaveBeenCalledWith('/models/:id/parameters', expect.any(Function));
    expect(mockRouter.get).toHaveBeenCalledWith('/models/:id/parameters', expect.any(Function));
    expect(mockRouter.post).toHaveBeenCalledWith('/models/refresh', expect.any(Function));
  });
  
  it('should return the router when getRouter is called', () => {
    const router = controller.getRouter();
    expect(router).toBe(mockRouter);
  });
  
  // Test that the handleGetModels method correctly calls the modelManager.listModelsWithDetails method
  it('should list models when GET /models is called', async () => {
    // Arrange
    const mockModels = [{ id: '1', name: 'test-model' }];
    const mockReq = {};
    const mockRes = { json: jest.fn() };
    const mockNext = jest.fn();
    
    mockModelManager.listModelsWithDetails.mockResolvedValue(mockModels);
    
    // Get the route handler function for GET /models
    const getModelsHandler = mockRouter.get.mock.calls.find(
      call => call[0] === '/models'
    )[1];
    
    // Act
    await getModelsHandler(mockReq, mockRes, mockNext);
    
    // Assert
    expect(mockModelManager.listModelsWithDetails).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({ models: mockModels });
    expect(mockNext).not.toHaveBeenCalled();
  });
  
  // Test error handling for GET /models
  it('should handle errors when listing models fails', async () => {
    // Arrange
    const mockError = new Error('Test error');
    const mockReq = {};
    const mockRes = { json: jest.fn() };
    const mockNext = jest.fn();
    
    mockModelManager.listModelsWithDetails.mockRejectedValue(mockError);
    
    // Get the route handler function for GET /models
    const getModelsHandler = mockRouter.get.mock.calls.find(
      call => call[0] === '/models'
    )[1];
    
    // Act
    await getModelsHandler(mockReq, mockRes, mockNext);
    
    // Assert
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
  
  // Test that the handlePullModel method correctly validates input and calls the modelManager.pullModel method
  it('should pull a model when POST /models/pull is called with valid data', async () => {
    // Arrange
    const mockModel = { id: '1', name: 'test-model', status: 'downloading' };
    const mockReq = { body: { modelName: 'test-model' } };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();
    
    mockModelManager.pullModel.mockResolvedValue(mockModel);
    
    // Get the route handler function for POST /models/pull
    const pullModelHandler = mockRouter.post.mock.calls.find(
      call => call[0] === '/models/pull'
    )[1];
    
    // Act
    await pullModelHandler(mockReq, mockRes, mockNext);
    
    // Assert
    expect(mockModelManager.pullModel).toHaveBeenCalledWith('test-model');
    expect(mockRes.status).toHaveBeenCalledWith(202);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      model: mockModel,
      message: expect.any(String)
    }));
  });
  
  // Test input validation for POST /models/pull
  it('should return 400 when POST /models/pull is called with missing model name', async () => {
    // Arrange
    const mockReq = { body: {} };
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const mockNext = jest.fn();
    
    // Get the route handler function for POST /models/pull
    const pullModelHandler = mockRouter.post.mock.calls.find(
      call => call[0] === '/models/pull'
    )[1];
    
    // Act
    await pullModelHandler(mockReq, mockRes, mockNext);
    
    // Assert
    expect(mockModelManager.pullModel).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });
}); 