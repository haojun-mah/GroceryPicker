"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ts-express-repro/repro.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
// This is the line structure causing the error, replicating your code:
// Defining a POST route with a string path and a single async handler function
// The handler function uses complex generics on Request and Response, and includes NextFunction
router.post('/my-endpoint', // The path string
async (// The async handler function
req, // Using generics for ResBody and ReqBody
res, // Using generics for ResBody
next // Including NextFunction parameter
) => {
    // Minimal function body - doesn't affect the type error reproduction
    // You can add a simple res.send() or res.json() if you like,
    // but it's not required to trigger the *type error*.
    console.log('This is a test handler.');
    // Example of minimal response (uncomment if you want valid runtime code,
    // but it's not needed for the *type error*):
    // res.json({ someResult: 'Success!' });
});
// The TypeScript error should appear on the line that starts 'router.post'.
// You can optionally export the router, but it's not needed for the type check
// export default router;
