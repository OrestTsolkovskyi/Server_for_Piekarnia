import express, { json } from 'express';
import { createServer } from 'http';
import { middleware } from 'express-openapi-validator';

import logger from 'morgan';

const app = express();


// = CORS headers ==============
// Avoid origin checks hassle if the frontend is not served from the same domain as the backend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})



// = LOGGER ====================
// Will log incoming requests in the console.
app.use(logger('dev'));


// = BODY PARSERS ==============
// HTTP request load (the "body" part) can be formatted in many ways. Parsers makes the content accessible for the application.

// application/json -- actually the only format we use (apart from the raw text which works without a dedicated parser)
app.use(json());


// = SOME STATIC CONTENT ===============
// Following URLs respond with the content of some local static file

// Server should provide a trivial test page at address localhost:3333/status (suits for quick test if the API Server works)
app.use('/status', express.static('status.html')),
app.use(express.static('gallery'))

// app.use('/login', (req, res) => res.status(200).json({
//   message: 'Successful',
// }))
// = API SUPPORT ================

// validator -- controls that requests and responses fulfill the specification
app.use(
  middleware({
    apiSpec: 'api-spec.yaml',
    validateApiSpec: true,
    validateRequests: true,
    validateResponses: true,
    fileUploader: false // we don't need a support for multipart/data-form
  }),
);

// All API endpoints starts with this prefix -- it make sense to put the API on a dedicated path to avoid collisions
// with other resources available on this server.
// KEEP IN SYNC with the servers.url in the API specification (we should just read it from there but
// we want keep it simple)
const baseAPIPath = '/api/level2'

// ENDPOINTS HANDLERS
import {
    handleTest,
    handleSignup,
    handleLogin,
    handleLogout,
    handleGetProducts,
    handleGetOrders,
    handleAddOrders,
    handleBestsellers,
    handleRemoveOrderItem,
    handleAdminLogout,
    handleManagerLogout,
    handleAdminGetOrders,
    handleAMDeclineOrder,
    handleChangeStatus,
    handleUserStatusProgress
} from './handlers.js';

//User
app.post(baseAPIPath + '/test', handleTest );

app.post('/login', handleLogin)
app.post('/logout', handleLogout)
app.post('/signup', handleSignup);

app.get('/products', handleGetProducts);
app.get('/bestsellers', handleBestsellers)

app.get('/orders', handleGetOrders)
app.post('/addOrders', handleAddOrders)

//Admin
app.post('/admin_logout', handleAdminLogout)
app.post('/manager_logout', handleManagerLogout)

app.get('/allOrders', handleAdminGetOrders)
app.get('/progressStatus', handleUserStatusProgress)

app.post('/removeOrderItem', handleRemoveOrderItem)
app.post('/declineOrder', handleAMDeclineOrder)

app.post('/changeStatus', handleChangeStatus)

// ... other handlers you write
// use app.get(baseAPIPath + <endpoint_url>, yourHandler) for GET method
// use app.post(baseAPIPath + <endpoint_url>, yourHandler) for POST methods

// = ERRORS HANDLER ===================
// Should remain as the last use-ed handler to catch errors that happened in previous handlers
app.use((err, req, res, next) => {
  // Wrap errors in some common form response (we use a JSON with known fields)
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

// = START THE SERVER ===============
const port = 3333

createServer(app).listen(port);
console.log(`API Server works at http://localhost:${port}`);
console.log(`Try open http://localhost:${port}/status in your browser to see the status page.`);

export default app;
