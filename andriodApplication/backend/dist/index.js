"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const grocerylist_1 = __importDefault(require("./routes/grocerylist"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/api/shopping-list', grocerylist_1.default);
app.get('/', (req, res) => {
    res.send('Backend server is running.');
});
// Start the server
app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`);
});
