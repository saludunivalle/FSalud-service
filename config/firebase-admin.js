const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');

let firebaseAdmin;

try {
  if (!admin.apps.length) {
    let credential;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Parse JSON credential from environment variable
      credential = admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      );
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Load from file path
      credential = admin.credential.cert(
        require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      );
    } else {
      // For development, could use application default credentials
      credential = admin.credential.applicationDefault();
      console.warn('Using application default credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH for production.');
    }
    
    firebaseAdmin = admin.initializeApp({
      credential: credential
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    firebaseAdmin = admin;
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  // Create a mock implementation for fallback
  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async () => {
        throw new Error('Firebase Admin SDK failed to initialize');
      }
    })
  };
}

module.exports = firebaseAdmin;