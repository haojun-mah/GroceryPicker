import request from 'supertest';
import express from 'express';
import { getAllUserGroceryLists } from '../controllers/getListsController';
import { getAllUserLists } from '../models/groceryListModel';
import { ControllerError } from '../interfaces';

// Mock the model function
jest.mock('../models/groceryListModel');
const mockedGetAllUserLists = getAllUserLists as jest.MockedFunction<typeof getAllUserLists>;

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('getAllUserGroceryLists Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.get('/test', getAllUserGroceryLists);
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.get('/test', getAllUserGroceryLists);

    const response = await request(appNoAuth).get('/test');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not authenticated.');
  });

  it('should return 200 with lists on successful fetch', async () => {
    const mockLists = [
      {
        list_id: 'test-list-1',
        user_id: 'test-user-id',
        title: 'Test List 1',
        metadata: null,
        list_status: 'incomplete' as const,
        grocery_list_items: []
      },
      {
        list_id: 'test-list-2',
        user_id: 'test-user-id',
        title: 'Test List 2',
        metadata: null,
        list_status: 'purchased' as const,
        grocery_list_items: []
      }
    ];

    mockedGetAllUserLists.mockResolvedValue(mockLists);

    const response = await request(app).get('/test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockLists);
    expect(mockedGetAllUserLists).toHaveBeenCalledWith('test-user-id');
  });

  it('should return error from model if fetch fails', async () => {
    const mockError = new ControllerError(500, 'Database error');
    mockedGetAllUserLists.mockResolvedValue(mockError);

    const response = await request(app).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database error');
  });

  it('should handle unexpected errors', async () => {
    mockedGetAllUserLists.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Failed to fetch grocery lists.');
    expect(response.body.details).toBe('Unexpected error');
  });
});
