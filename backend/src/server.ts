import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { authMiddleware, createApolloContext } from './middleware/auth';

import { typeDefs } from './graphql/schema'; // Import all type definitions
import { resolvers } from './graphql/resolvers'; // Import all resolvers
import { connectToDatabase, getPool } from './graphql/utils/dbConnection'; // Import database connection functions

import axios from 'axios';
import querystring from 'querystring';

const app: Application = express();
const port = process.env.PORT || 3000;

// Google OAuth credentials
const CLIENT_ID ='17543999702-hf3su5dua5q1fuhfmeth5a6mgtf2acce.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/callback'; // Ensure this is in Google Cloud Console

// Connect to SQL Server
connectToDatabase(); // Establish the database connection

// Apply authentication middleware before setting up Apollo Server
app.use(authMiddleware);

// Apollo Server setup
const server = new ApolloServer({
  typeDefs, // Provide the type definitions (schemas)
  resolvers, // Provide the resolvers
  context: ({ req }) => {
    // Combine authentication context with database pool
    return {
      ...createApolloContext({ req }),
      pool: getPool() // Pass the database pool to resolvers for DB access
    };
  }
});

// Start the Apollo Server
async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' }); // Apply Apollo middleware to Express app
}

startServer();

// Google OAuth callback route
app.get('/callback', async (req, res) => {
  // Explicitly cast the code to a string
  const code = String(req.query.code); // Ensure `code` is a string

  if (!code) {
    return res.status(400).send('Authorization code not found');
  }

  // Exchange the authorization code for an access token and ID token
  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      querystring.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { id_token } = response.data;

    // You can now store the id_token or send it back to the client as needed
    res.json({ id_token });

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send('Error during authentication');
  }
});


// REST API route for basic testing
app.get('/', (_req, res) => {
  res.send('Hello, World!'); // A simple endpoint to check the server
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);
});
