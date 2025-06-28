import request from 'supertest';
import express from 'express';
import { updateGroceryList } from '../controllers/updateGroceryListController';
import { updateGroceryListsAndItems } from '../models/groceryListModel';
import { ControllerError, ControllerSuccess } from '../interfaces';

// Mock the model function
jest.mock('../models/groceryListModel');
const mockedUpdateGroceryListsAndItems = updateGroceryListsAndItems as jest.MockedFunction<typeof updateGroceryListsAndItems>;

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('updateGroceryList Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.patch('/test', updateGroceryList);
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.patch('/test', updateGroceryList);

    const response = await request(appNoAuth)
      .patch('/test')
      .send([]);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not authenticated.');
  });

  it('should return 400 if body is not an array', async () => {
    const response = await request(app)
      .patch('/test')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request body must be a non-empty array of lists.');
  });

  it('should return 400 if body is an empty array', async () => {
    const response = await request(app)
      .patch('/test')
      .send([]);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request body must be a non-empty array of lists.');
  });

  it('should return 200 on successful update with no errors', async () => {
    const mockLists = [
      {
        list_id: 'test-list-1',
        user_id: 'test-user-id',
        title: 'Test List',
        metadata: null,
        list_status: 'incomplete' as const,
        grocery_list_items: []
      }
    ];

    mockedUpdateGroceryListsAndItems.mockResolvedValue({
      updatedLists: mockLists,
      errors: []
    });

    const response = await request(app)
      .patch('/test')
      .send(mockLists);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Batch grocery list and item update complete.');
    expect(response.body.details).toEqual(mockLists);
  });

  it('should return 207 on partial success with errors', async () => {
    const mockLists = [
      {
        list_id: 'test-list-1',
        user_id: 'test-user-id',
        title: 'Test List',
        metadata: null,
        list_status: 'incomplete' as const,
        grocery_list_items: []
      }
    ];

    mockedUpdateGroceryListsAndItems.mockResolvedValue({
      updatedLists: [],
      errors: [
        {
          list_id: 'test-list-1',
          error: new ControllerError(400, 'Test error')
        }
      ]
    });

    const response = await request(app)
      .patch('/test')
      .send(mockLists);

    expect(response.status).toBe(207);
    expect(response.body.message).toBe('Batch update completed with some errors.');
    expect(response.body.details).toBe('List test-list-1: Test error');
  });

  it('should return 500 on model error', async () => {
    const mockLists = [
      {
        list_id: 'test-list-1',
        user_id: 'test-user-id',
        title: 'Test List',
        metadata: null,
        list_status: 'incomplete' as const,
        grocery_list_items: []
      }
    ];

    mockedUpdateGroceryListsAndItems.mockResolvedValue(
      new ControllerError(500, 'Database error')
    );

    const response = await request(app)
      .patch('/test')
      .send(mockLists);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database error');
  });
});
