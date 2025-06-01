"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/grocery.ts
const express_1 = require("express");
const supabase_1 = __importDefault(require("../services/supabase"));
const router = (0, express_1.Router)();
const fetchPricesHandler = async (req, res, _next) => {
    const requestBody = req.body;
    const { items } = requestBody;
    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Request body must contain a non-empty array of "items".' });
        return;
    }
    console.log(`Fetching prices for items: ${items.join(', ')}`);
    // Query database
    try {
        const { data, error } = await supabase_1.default
            .from('products')
            .select('name, price, supermarket')
            .in('name', items);
        // Handle database errors
        if (error) {
            console.error('Error querying Supabase:', error.message);
            res.status(500).json({ error: 'Failed to fetch prices from database: ' + error.message });
            return;
        }
        // Process results
        const dbItems = data || [];
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
        // Send success response
        console.log('Successfully fetched and processed prices.');
        res.json(results);
    }
    catch (error) {
        // Handle unexpected errors
        console.error('Internal server error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred.';
        res.status(500).json({ error: 'Internal server error: ' + errorMessage });
        return;
    }
};
// Define the POST /prices endpoint
router.post('/prices', fetchPricesHandler);
// Export the router
exports.default = router;
