import request from 'supertest';
import express from 'express';
import { updateListStatus } from '../controllers/updateListStatusController';
import { updateGroceryListStatus } from '../models/groceryListModel';
import { ControllerError, ControllerSuccess } from '../interfaces';

// Mock the model function
jest.mock('../models/groceryListModel');
const mockedUpdateGroceryListStatus = updateGroceryListStatus as jest.MockedFunction<typeof updateGroceryListStatus>;

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('updateListStatus Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.patch('/test', updateListStatus);
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.patch('/test', updateListStatus);

    const response = await request(appNoAuth)
      .patch('/test')
      .send({ list_id: 'test-id', list_status: 'purchased' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not authenticated.');
  });

  it('should return 400 if list_id is missing', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ list_status: 'purchased' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing list_id or list_status in request body.');
  });

  it('should return 400 if list_status is missing', async () => {
    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-id' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing list_id or list_status in request body.');
  });

  it('should return 200 on successful update', async () => {
    const mockResult = { success: true, message: 'Grocery list status updated successfully.' };
    mockedUpdateGroceryListStatus.mockResolvedValue(mockResult);

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-id', list_status: 'purchased' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Grocery list status updated successfully.');
    expect(mockedUpdateGroceryListStatus).toHaveBeenCalledWith('test-user-id', 'test-id', 'purchased');
  });

  it('should return error from model if update fails', async () => {
    const mockError = new ControllerError(404, 'List not found');
    mockedUpdateGroceryListStatus.mockResolvedValue(mockError);

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-id', list_status: 'purchased' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('List not found');
  });

  it('should handle unexpected errors', async () => {
    mockedUpdateGroceryListStatus.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .patch('/test')
      .send({ list_id: 'test-id', list_status: 'purchased' });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Failed to update grocery list status.');
    expect(response.body.details).toBe('Unexpected error');
  });
});
