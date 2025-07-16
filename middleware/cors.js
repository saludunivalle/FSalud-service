// middleware/cors.js

const cors = require('cors');

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://documentosfsalud.vercel.app' // URL del frontend en producción
];

// Si tienes una variable de entorno para el frontend, puedes añadirla también
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como Postman o apps móviles) o si el origen está en la lista blanca
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // If you need cookies/authorization headers
  optionsSuccessStatus: 200 // Cambiado a 200 para compatibilidad
};

module.exports = () => cors(corsOptions);