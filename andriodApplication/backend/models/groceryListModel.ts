import supabase from '../config/supabase';
import {
  SaveGroceryListRequestBody,
  SavedGroceryList,
  ControllerError,
  SavedGroceryListItem,
  isValidGroceryListStatus,
} from '../interfaces';
import {
  handleDatabaseError,
  verifyListOwnership,
  insertGroceryItems,
  parsePrice,
  sortGroceryItemsByName,
} from '../utils/groceryUtils';

// Function to save a new grocery list and its items
export async function saveUserGroceryList(
  userId: string,
  listData: SaveGroceryListRequestBody,
): Promise<SavedGroceryList | ControllerError> {
  const { title, metadata, items } = listData;

  // Use a transaction to ensure both inserts succeed or fail together
  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .insert({
      user_id: userId,
      title: title,
      metadata: metadata,
    })
    .select()
    .single();

  if (listError) {
    return handleDatabaseError('save grocery list', listError);
  }

  const savedListId = list.list_id;

  // Insert items using utility function
  const itemInsertError = await insertGroceryItems(savedListId, items);
  if (itemInsertError) {
    return itemInsertError;
  }

  // Refetch the complete list with its items to return to the client
  return await getGroceryListById(savedListId, userId);
}

/*
  Function to add new items to an existing grocery list
  
  - Verifies list ownership before adding items (security)
  - Inserts items with default 'incomplete' status
  - Supports both basic grocery items and optimized items with product_ids
  - Returns the complete updated list with all items
  - Handles item format conversion internally for flexibility
  
  Parameters:
  - userId: User ID for ownership verification
  - listId: Target list ID to add items to
  - items: Array of grocery items to add (without item_id/list_id as they're auto-generated)
          Can accept both SavedGroceryListItem format or GeneratedGroceryItem format
  
  Returns: Updated SavedGroceryList or ControllerError
*/
// Function to add items to an existing grocery list
export async function addItemsToExistingList(
  userId: string,
  listId: string,
  items: (Omit<SavedGroceryListItem, 'item_id' | 'list_id'> | any)[]
): Promise<SavedGroceryList | ControllerError> {
  // Verify list ownership first using utility function
  const ownershipResult = await verifyListOwnership(listId, userId);
  if ('statusCode' in ownershipResult) {
    return ownershipResult;
  }

  // Insert items using utility function
  const itemInsertError = await insertGroceryItems(listId, items);
  if (itemInsertError) {
    return itemInsertError;
  }

  // Return the updated list with all items
  return await getGroceryListById(listId, userId);
}

// Function to get a single list by its ID (and check ownership)
export async function getGroceryListById(
  listId: string,
  userId: string,
): Promise<SavedGroceryList | ControllerError> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select(`
      *,
      grocery_list_items (
        *,
        product:product_id (
          product_id, name, price, supermarket, quantity, product_url, image_url
        )
      )
    `)
    .eq('list_id', listId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return handleDatabaseError('fetch single list', error, 'List not found or you do not have permission to view it.');
  }
  
  return data;
}

// Function to get all lists for a specific user
export async function getAllUserLists(
  userId: string,
): Promise<SavedGroceryList[] | ControllerError> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select(
      `
      *,
      grocery_list_items (
        *,
        product:product_id (
          product_id, name, price, supermarket, quantity, product_url, image_url
        )
      )
    `,
    )
    .eq('user_id', userId)
    .neq('list_status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) {
    return handleDatabaseError('fetch all user lists', error);
  }

  // Sort grocery list items by product name using utility function
  const sortedData = (data || []).map(list => ({
    ...list,
    grocery_list_items: sortGroceryItemsByName(list.grocery_list_items)
  }));

  return sortedData || [];
}

// Batch update grocery lists and their items.
// Accepts an array of objects with at least list_id, and optionally list_status and grocery_list_items.
// For each list:
//   - If list_status is present, updates the list's status (with strict validation).
//   - If grocery_list_items is present, updates the 'item_status' field for each item (if both item_id and item_status are provided).
//   - When item_status: 'purchased':
//       - If purchased_price is provided, uses it (manual override).
//       - If purchased_price is not provided, always snapshots the current product price (overriding any previous value).
//   - When item_status: 'incomplete', 'archived', or 'deleted':
//       - Clears purchased_price (sets to null).
//   - Ignores other fields in grocery_list_items.
// Returns all updated lists and any errors. Always overrides purchased_price on new purchase requests.
export async function updateGroceryListsAndItems(
  userId: string,
  lists: (Partial<SavedGroceryList> & { list_id: string })[],
): Promise<
  | {
      updatedLists: SavedGroceryList[];
      errors: { list_id: string; error: ControllerError }[];
    }
  | ControllerError
> {
  const updatedLists: SavedGroceryList[] = [];
  const errors: { list_id: string; error: ControllerError }[] = [];

  for (const list of lists) {
    // Check ownership
    const { data: foundList, error: listError } = await supabase
      .from('grocery_lists')
      .select('user_id')
      .eq('list_id', list.list_id)
      .single();
    if (listError || !foundList) {
      errors.push({
        list_id: list.list_id,
        error: new ControllerError(404, 'List not found or access denied'),
      });
      continue;
    }
    if (foundList.user_id !== userId) {
      errors.push({
        list_id: list.list_id,
        error: new ControllerError(403, 'Forbidden: You do not own this list.'),
      });
      continue;
    }

    // Update list status if provided
    if (typeof list.list_status !== 'undefined') {
      // Validate list_status strictly
      if (!isValidGroceryListStatus(list.list_status)) {
        errors.push({
          list_id: list.list_id,
          error: new ControllerError(
            400,
            `Invalid list_status: ${list.list_status}`,
          ),
        });
        continue;
      }
      const { error: updateListError } = await supabase
        .from('grocery_lists')
        .update({ list_status: list.list_status })
        .eq('list_id', list.list_id)
        .eq('user_id', userId);
      if (updateListError) {
        errors.push({
          list_id: list.list_id,
          error: new ControllerError(
            500,
            'Failed to update grocery list status.',
            updateListError.message,
          ),
        });
        continue;
      }
    }

    // Update each item if present
    if (Array.isArray(list.grocery_list_items) && list.grocery_list_items.length > 0) {
      for (const item of list.grocery_list_items) {
        const { item_id, item_status, purchased_price } = item;
        if (!item_id || typeof item_status === 'undefined') continue;

        // Prepare update data with price tracking logic
        let updateData: any = { item_status };

        // Handle price snapshotting when item is marked as purchased
        if (item_status === 'purchased') {
          // If manual price is provided, use it
          if (typeof purchased_price === 'number') {
            updateData.purchased_price = purchased_price;
          } else {
            // Always snapshot the current product price if item_status is 'purchased' and no manual price is provided
            const { data: currentItem, error: currentItemError } = await supabase
              .from('grocery_list_items')
              .select('product_id')
              .eq('item_id', item_id)
              .eq('list_id', list.list_id)
              .single();

            if (!currentItemError && currentItem && currentItem.product_id) {
              // Fetch current price from products table
              const { data: productData, error: productError } = await supabase
                .from('products')
                .select('price')
                .eq('product_id', currentItem.product_id)
                .single();

              if (!productError && productData && productData.price) {
                // Parse price using utility function
                const priceNumber = parsePrice(productData.price);
                if (priceNumber !== null) {
                  updateData.purchased_price = priceNumber;
                }
              }
            }
          }
        } else {
          // If not purchased, clear the purchased_price
          updateData.purchased_price = null;
        }

        // Update the item with all prepared data
        const { error: itemError } = await supabase
          .from('grocery_list_items')
          .update(updateData)
          .eq('item_id', item_id)
          .eq('list_id', list.list_id);
        
        if (itemError) {
          console.error(`Model: Error updating item ${item_id} in list ${list.list_id}:`, itemError);
          errors.push({
            list_id: list.list_id,
            error: new ControllerError(
              500,
              `Failed to update item ${item_id}.`,
              itemError.message,
            ),
          });
          continue;
        }
      }
    }

    // Refetch and add the updated list
    const { data: updatedList, error: fetchError } = await supabase
      .from('grocery_lists')
      .select(`*, grocery_list_items ( * )`)
      .eq('list_id', list.list_id)
      .single();
    if (fetchError || !updatedList) {
      errors.push({
        list_id: list.list_id,
        error: new ControllerError(
          500,
          'Failed to fetch updated grocery list.',
          fetchError?.message,
        ),
      });
      continue;
    }
    updatedLists.push(updatedList);
  }

  return { updatedLists, errors };
}
