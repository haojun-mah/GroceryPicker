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

  describe('minimal valid requests', () => {
    /**
     * These tests cover the minimal valid payloads accepted by the updateGroceryList controller:
     * 1. Only list_id and grocery_list_items
     * 2. list_id, list_status, and grocery_list_items
     * 3. Only list_id and list_status
     */
    it('should accept only list_id and grocery_list_items', async () => {
      const minimalList1 = [
        {
          list_id: 'd4e5f2ed-35aa-48e9-9cb2-9e914dc15199',
          grocery_list_items: [
            {
              item_id: 'ed76202d-37e7-45e3-bc03-23b46ffe0502',
              purchased: false
            }
          ]
        }
      ];
      mockedUpdateGroceryListsAndItems.mockResolvedValue({
        updatedLists: [
          {
            list_id: minimalList1[0].list_id,
            user_id: 'test-user-id',
            title: '',
            metadata: null,
            list_status: 'incomplete',
            grocery_list_items: [
              {
                item_id: 'ed76202d-37e7-45e3-bc03-23b46ffe0502',
                list_id: minimalList1[0].list_id,
                name: 'Test Item 1',
                quantity: 1,
                unit: 'pcs',
                purchased: false
              }
            ]
          }
        ],
        errors: []
      });
      const response = await request(app)
        .patch('/test')
        .send(minimalList1);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Batch grocery list and item update complete.');
      expect(response.body.details[0].list_id).toBe(minimalList1[0].list_id);
      expect(response.body.details[0].grocery_list_items[0].item_id).toBe(minimalList1[0].grocery_list_items[0].item_id);
      expect(response.body.details[0].grocery_list_items[0].purchased).toBe(false);
    });

    it('should accept list_id, list_status, and grocery_list_items', async () => {
      const minimalList2 = [
        {
          list_id: 'f41d4f0b-732f-4df9-bf5d-6783c5f05ed0',
          list_status: 'deleted',
          grocery_list_items: [
            {
              item_id: '2098193b-db13-4884-b27a-e65ca89da1d4',
              purchased: false
            }
          ]
        }
      ];
      mockedUpdateGroceryListsAndItems.mockResolvedValue({
        updatedLists: [
          {
            list_id: minimalList2[0].list_id,
            user_id: 'test-user-id',
            title: '',
            metadata: null,
            list_status: 'deleted',
            grocery_list_items: [
              {
                item_id: '2098193b-db13-4884-b27a-e65ca89da1d4',
                list_id: minimalList2[0].list_id,
                name: 'Test Item 2',
                quantity: 2,
                unit: 'pcs',
                purchased: false
              }
            ]
          }
        ],
        errors: []
      });
      const response = await request(app)
        .patch('/test')
        .send(minimalList2);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Batch grocery list and item update complete.');
      expect(response.body.details[0].list_id).toBe(minimalList2[0].list_id);
      expect(response.body.details[0].list_status).toBe('deleted');
      expect(response.body.details[0].grocery_list_items[0].item_id).toBe(minimalList2[0].grocery_list_items[0].item_id);
      expect(response.body.details[0].grocery_list_items[0].purchased).toBe(false);
    });

    it('should accept only list_id and list_status', async () => {
      const minimalListStatusOnly = [
        {
          list_id: 'f41d4f0b-732f-4df9-bf5d-6783c5f05ed0',
          list_status: 'deleted'
        }
      ];
      mockedUpdateGroceryListsAndItems.mockResolvedValue({
        updatedLists: [
          {
            list_id: minimalListStatusOnly[0].list_id,
            user_id: 'test-user-id',
            title: 'Test List',
            metadata: null,
            list_status: 'deleted',
            grocery_list_items: []
          }
        ],
        errors: []
      });
      const response = await request(app)
        .patch('/test')
        .send(minimalListStatusOnly);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Batch grocery list and item update complete.');
      expect(response.body.details[0].list_id).toBe(minimalListStatusOnly[0].list_id);
      expect(response.body.details[0].list_status).toBe('deleted');
    });
  });
});
