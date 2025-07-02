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
    amount: item.amount !== undefined ? item.amount : 0, // default to 0 if not provided
  }));
  
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
      grocery_list_items (
        *,
        product:product_id (
          product_id, name, price, supermarket, quantity, product_url, image_url
        )
      )
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

  // Sort grocery list items by product name
  const sortedData = (data || []).map(list => ({
    ...list,
    grocery_list_items: list.grocery_list_items.sort((a: any, b: any) => {
      // Get product names, fallback to item name if no product
      const nameA = a.product?.name || a.name || '';
      const nameB = b.product?.name || b.name || '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' });
    })
  }));

  return sortedData || [];
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
        const { item_id, purchased, purchased_price } = item;
        if (!item_id || typeof purchased === 'undefined') continue;

        // Prepare update data with price tracking logic
        let updateData: any = { purchased };

        // Handle price snapshotting when item is marked as purchased
        if (purchased === true) {
          // If manual price is provided, use it
          if (typeof purchased_price === 'number') {
            updateData.purchased_price = purchased_price;
          } else {
            // Automatic price snapshotting - get current item to check conditions
            const { data: currentItem, error: currentItemError } = await supabase
              .from('grocery_list_items')
              .select('product_id, purchased_price')
              .eq('item_id', item_id)
              .eq('list_id', list.list_id)
              .single();

            // Only snapshot if item has product_id and no existing purchased_price
            if (!currentItemError && currentItem && currentItem.product_id && !currentItem.purchased_price) {
              // Fetch current price from products table
              const { data: productData, error: productError } = await supabase
                .from('products')
                .select('price')
                .eq('product_id', currentItem.product_id)
                .single();

              if (!productError && productData && productData.price) {
                // Convert price string to number and snapshot it
                const priceNumber = parseFloat(productData.price);
                if (!isNaN(priceNumber)) {
                  updateData.purchased_price = priceNumber;
                }
              }
            }
          }
        } else if (purchased === false) {
          // If unmarking as purchased, clear the purchased_price
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
