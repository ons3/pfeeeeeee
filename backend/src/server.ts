import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { authMiddleware, createApolloContext } from './middleware/auth';
import dotenv from 'dotenv';

import { typeDefs } from './graphql/schema'; // Import all type definitions
import { resolvers } from './graphql/resolvers'; // Import all resolvers
import { connectToDatabase, getPool } from './graphql/utils/dbConnection'; // Import database connection functions

// Charger les variables d'environnement
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 5000;

// Connect to SQL Server
connectToDatabase(); // Establish the database connection

// Apply authentication middleware
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

// REST API route for basic testing
app.get('/', (_req, res) => {
  res.send('Hello, World!'); // A simple endpoint to check the server
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);
});