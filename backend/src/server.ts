import express, { Application, Request, Response } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { authMiddleware, createApolloContext } from './middleware/auth';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { connectToDatabase, getPool } from './graphql/utils/dbConnection';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

connectToDatabase(); // Connect to SQL Server

app.use(express.json());
app.use(authMiddleware); // Authentication middleware

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    ...createApolloContext({ req }),
    pool: getPool(),
  }),
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}

startServer();

// OAuth Callback Route (returns token instead of setting a cookie)
app.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Authorization code not found');

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

    res.json({ token: id_token }); // Send token in response, no cookies

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send('Error during authentication');
  }
});

// Health Check
app.get('/', (_req, res) => res.send('Server is running!'));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`GraphQL: http://localhost:${port}/graphql`);
});
