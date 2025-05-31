"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/grocery.ts
const express_1 = require("express"); // Import RequestHandler type
const supabase_1 = __importDefault(require("../services/supabase"));
// --- Create an Express Router instance ---
const router = (0, express_1.Router)();
// --- Define the API Endpoint Handler Function Separately ---
// Explicitly type the handler using the RequestHandler generic for strong typing.
const fetchPricesHandler = async (req, res, _next) => {
    // Inside the function, req and res are now strongly typed
    // req.body is typed as FetchPricesRequestBody
    // res.json() will expect FetchedItemResponse[] or ErrorResponse
    const { items } = req.body;
    // --- Input Validation ---
    if (!Array.isArray(items) || items.length === 0) {
        console.warn('Received invalid request body: items is not a non-empty array.');
        // TypeScript checks that the object matches the ErrorResponse type in the ResBody generic
        return res.status(400).json({ error: 'Request body must contain a non-empty array of "items".' });
    }
    console.log(`Received request to fetch prices for items: ${items.join(', ')}`);
    // --- Database Interaction ---
    try {
        // Type the result of the Supabase query
        const { data, error } = await supabase_1.default
            .from('products') // Ensure 'products' matches your Supabase table name
            .select('name, price, supermarket') // Ensure these match the ProductRow interface keys
            .in('name', items);
        // --- Handle Database Errors ---
        if (error) {
            console.error('Error querying Supabase:', error.message);
            // TypeScript checks that the object matches the ErrorResponse type
            return res.status(500).json({ error: 'Failed to fetch prices from database: ' + error.message });
        }
        // --- Process Results ---
        const dbItems = data || []; // Ensure 'data' is treated as an array or empty array
        const results = items.map(itemName => {
            const foundItem = dbItems.find(dbItem => dbItem.name === itemName);
            if (foundItem) {
                return {
                    name: foundItem.name,
                    price: foundItem.price !== null ? foundItem.price : undefined,
                    supermarket: foundItem.supermarket !== null ? foundItem.supermarket : undefined,
                    found: true
                };
            }
            else {
                return {
                    name: itemName,
                    found: false
                };
            }
        });
        // --- Send Success Response ---
        console.log('Successfully fetched and processed prices.');
        // TypeScript checks that 'results' is assignable to FetchedItemResponse[]
        res.json(results);
    }
    catch (error) {
        // --- Handle Unexpected Errors ---
        console.error('Internal server error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred.';
        // TypeScript checks that the object matches the ErrorResponse type
        res.status(500).json({ error: 'Internal server error: ' + errorMessage });
    }
    // We do not call next() here
};
// --- Define the API Endpoint using the Separated Handler ---
// Pass the explicitly typed handler variable to router.post.
router.post('/prices', fetchPricesHandler); // Pass the variable here
// --- Export the router ---
exports.default = router;
