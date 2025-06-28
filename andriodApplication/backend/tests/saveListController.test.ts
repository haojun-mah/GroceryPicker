import request from 'supertest';
import express from 'express';
import { saveGroceryList } from '../controllers/saveListController';
import { saveUserGroceryList } from '../models/groceryListModel';
import { ControllerError } from '../interfaces';

// Mock the model function
jest.mock('../models/groceryListModel');
const mockedSaveUserGroceryList = saveUserGroceryList as jest.MockedFunction<typeof saveUserGroceryList>;

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('saveGroceryList Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.post('/test', saveGroceryList);
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.post('/test', saveGroceryList);

    const response = await request(appNoAuth)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not authenticated.');
  });

  it('should return 400 if title is missing', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing or invalid required fields (title, items).');
  });

  it('should return 400 if items array is empty', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: []
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing or invalid required fields (title, items).');
  });

  it('should return 400 if item format is invalid', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 'invalid', unit: 'piece' }]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid item format within the list.');
  });

  it('should return 400 if product_id format is invalid', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece', product_id: 123 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid product_id format.');
  });

  it('should return 400 if amount format is invalid', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece', amount: 'invalid' }]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid amount format.');
  });

  it('should return 201 on successful save', async () => {
    const mockSavedList = {
      list_id: 'test-list-id',
      user_id: 'test-user-id',
      title: 'Test List',
      metadata: null,
      list_status: 'incomplete' as const,
      grocery_list_items: []
    };

    mockedSaveUserGroceryList.mockResolvedValue(mockSavedList);

    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockSavedList);
  });

  it('should return error from model if save fails', async () => {
    mockedSaveUserGroceryList.mockResolvedValue(
      new ControllerError(500, 'Database error')
    );

    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database error');
  });

  it('should handle metadata correctly', async () => {
    const mockSavedList = {
      list_id: 'test-list-id',
      user_id: 'test-user-id',
      title: 'Test List',
      metadata: 'test metadata',
      list_status: 'incomplete' as const,
      grocery_list_items: []
    };

    mockedSaveUserGroceryList.mockResolvedValue(mockSavedList);

    const response = await request(app)
      .post('/test')
      .send({
        title: 'Test List',
        metadata: 'test metadata',
        items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
      });

    expect(response.status).toBe(201);
    expect(mockedSaveUserGroceryList).toHaveBeenCalledWith('test-user-id', {
      title: 'Test List',
      metadata: 'test metadata',
      items: [{ name: 'Apple', quantity: 1, unit: 'piece' }]
    });
  });
});
