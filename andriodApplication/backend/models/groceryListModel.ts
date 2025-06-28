import supabase from '../config/supabase';
import {
  SaveGroceryListRequestBody,
  SavedGroceryList,
  ControllerError,
  SavedGroceryListItem,
  isValidGroceryListStatus,
} from '../interfaces';

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
    console.error('Model: Error inserting grocery list:', listError);
    return new ControllerError(
      500,
      'Failed to save grocery list.',
      listError.message,
    );
  }

  const savedListId = list.list_id;

  // Prepare the items to be inserted, linking them to the new list's ID
  const itemsToInsert = items.map((item) => ({
    list_id: savedListId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    purchased: false,
    product_id: item.product_id || null, // direct mapping to products table
    amount: item.amount !== undefined ? item.amount : null, // recommended amount
  }));
  console.log('flag');
  console.log(itemsToInsert);

  const { error: itemsError } = await supabase
    .from('grocery_list_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Model: Error inserting grocery list items:', itemsError);
    return new ControllerError(
      500,
      'Failed to save grocery list items.',
      itemsError.message,
    );
  }

  // Refetch the complete list with its items to return to the client
  return await getGroceryListById(savedListId, userId);
}

// Function to get a single list by its ID (and check ownership)
export async function getGroceryListById(
  listId: string,
  userId: string,
): Promise<SavedGroceryList | ControllerError> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select(
      `
      *,
      grocery_list_items ( * )
    `,
    )
    .eq('list_id', listId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Model: Error fetching single list:', error);
    return new ControllerError(
      404,
      'List not found or you do not have permission to view it.',
      error.message,
    );
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
    console.error('Model: Error fetching all user lists:', error);
    return new ControllerError(
      500,
      'Failed to fetch grocery lists.',
      error.message,
    );
  }
  return data || [];
}

// Function to update the status of a grocery list
export async function updateGroceryListStatus(
  userId: string,
  listId: string,
  newStatus: string,
): Promise<{ success: boolean; message: string } | ControllerError> {
  // Check ownership: ensure the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .select('user_id')
    .eq('list_id', listId)
    .single();
  if (listError || !list) {
    return new ControllerError(404, 'List not found or access denied.');
  }
  if (list.user_id !== userId) {
    return new ControllerError(403, 'Forbidden: You do not own this list.');
  }

  const { error } = await supabase
    .from('grocery_lists')
    .update({ list_status: newStatus })
    .eq('list_id', listId)
    .eq('user_id', userId);

  if (error) {
    console.error('Model: Error updating grocery list status:', error);
    return new ControllerError(
      500,
      'Failed to update grocery list status.',
      error.message,
    );
  }
  return {
    success: true,
    message: 'Grocery list status updated successfully.',
  };
}

// Function to update the status of a grocery list item
export async function updateGroceryListItemStatus(
  userId: string,
  listId: string,
  itemId: string,
  fieldsToUpdate: Partial<SavedGroceryListItem>,
): Promise<{ success: boolean; item?: any } | ControllerError> {
  // Check ownership: ensure the list belongs to the user
  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .select('user_id')
    .eq('list_id', listId)
    .single();
  if (listError || !list) {
    return new ControllerError(404, 'List not found or access denied');
  }
  if (list.user_id !== userId) {
    return new ControllerError(403, 'Forbidden');
  }
  // Update the specified fields for the item
  const { data: item, error: itemError } = await supabase
    .from('grocery_list_items')
    .update(fieldsToUpdate)
    .eq('list_id', listId)
    .eq('item_id', itemId)
    .select()
    .single();
  if (itemError || !item) {
    return new ControllerError(404, 'Item not found or update failed');
  }
  return { success: true, item };
}

// Batch update grocery lists and their items.
// Accepts an array of objects with at least list_id, and optionally list_status and grocery_list_items.
// For each list:
//   - If list_status is present, updates the list's status.
//   - If grocery_list_items is present, only updates the 'purchased' field for each item (if both item_id and purchased are provided).
//   - Ignores other fields in grocery_list_items for now.
// Returns all updated lists and any errors.
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
        const { item_id, purchased } = item;
        if (!item_id || typeof purchased === 'undefined') continue;
        const { error: itemError } = await supabase
          .from('grocery_list_items')
          .update({ purchased })
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
