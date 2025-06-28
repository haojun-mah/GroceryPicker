import request from 'supertest';
import express from 'express';
import { updateItemStatus } from '../controllers/updateItemStatusController';
import { updateGroceryListItemStatus } from '../models/groceryListModel';
import { ControllerError, ControllerSuccess } from '../interfaces';

// Mock the model function
jest.mock('../models/groceryListModel');
const mockedUpdateGroceryListItemStatus = updateGroceryListItemStatus as jest.MockedFunction<typeof updateGroceryListItemStatus>;

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('updateItemStatus Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.patch('/test', updateItemStatus);
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.patch('/test', updateItemStatus);

    const response = await request(appNoAuth)
      .patch('/test')
      .send({ list_id: 'test-list-id', item_id: 'test-item-id', purchased: true });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not authenticated.');
  });

  it('should return 400 if list_id is missing', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ item_id: 'test-item-id', purchased: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing list_id, item_id, or fields to update.');
  });

  it('should return 400 if item_id is missing', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-list-id', purchased: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing list_id, item_id, or fields to update.');
  });

  it('should return 400 if no fields to update', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-list-id', item_id: 'test-item-id' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing list_id, item_id, or fields to update.');
  });

  it('should return 400 if invalid fields are provided', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ 
        list_id: 'test-list-id', 
        item_id: 'test-item-id', 
        invalidField: 'value',
        purchased: true 
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid field(s) in update');
  });

  it('should return 200 on successful update', async () => {
    const mockResult = { 
      success: true, 
      item: { 
        item_id: 'test-item-id',
        list_id: 'test-list-id',
        name: 'Apple',
        quantity: 1,
        unit: 'piece',
        purchased: true,
        product_id: null,
        amount: null
      }
    };
    mockedUpdateGroceryListItemStatus.mockResolvedValue(mockResult);

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-list-id', item_id: 'test-item-id', purchased: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Grocery list item updated successfully.');
    expect(mockedUpdateGroceryListItemStatus).toHaveBeenCalledWith(
      'test-user-id', 
      'test-list-id', 
      'test-item-id', 
      { purchased: true }
    );
  });

  it('should return error from model if update fails', async () => {
    const mockError = new ControllerError(404, 'Item not found');
    mockedUpdateGroceryListItemStatus.mockResolvedValue(mockError);

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-list-id', item_id: 'test-item-id', purchased: true });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Item not found');
  });

  it('should handle multiple field updates', async () => {
    const mockResult = { 
      success: true, 
      item: { 
        item_id: 'test-item-id',
        list_id: 'test-list-id',
        name: 'Apple',
        quantity: 2,
        unit: 'pieces',
        purchased: true,
        product_id: 'product-123',
        amount: 5
      }
    };
    mockedUpdateGroceryListItemStatus.mockResolvedValue(mockResult);

    const response = await request(app)
      .patch('/test')
      .send({ 
        list_id: 'test-list-id', 
        item_id: 'test-item-id', 
        purchased: true,
        quantity: 2,
        unit: 'pieces',
        product_id: 'product-123',
        amount: 5
      });

    expect(response.status).toBe(200);
    expect(mockedUpdateGroceryListItemStatus).toHaveBeenCalledWith(
      'test-user-id', 
      'test-list-id', 
      'test-item-id', 
      { 
        purchased: true,
        quantity: 2,
        unit: 'pieces',
        product_id: 'product-123',
        amount: 5
      }
    );
  });

  it('should handle unexpected errors', async () => {
    mockedUpdateGroceryListItemStatus.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-list-id', item_id: 'test-item-id', purchased: true });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Failed to update item status.');
    expect(response.body.details).toBe('Unexpected error');
  });
});
