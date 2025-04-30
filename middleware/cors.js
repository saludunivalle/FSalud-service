// middleware/cors.js

const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:3000', 'https://your-deployed-frontend.com'], // Add your frontend origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // If you need cookies/authorization headers
  optionsSuccessStatus: 204
};

module.exports = () => cors(corsOptions);