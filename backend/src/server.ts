import express, { Application, Request, Response } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { authMiddleware, createApolloContext } from './middleware/auth';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { connectToDatabase, getPool } from './graphql/utils/dbConnection';
import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();
console.log("Email User:", process.env.EMAIL_USER);
console.log("Email Pass Exists:", Boolean(process.env.EMAIL_PASS));


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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',      // Specify Gmail's SMTP server host
  port: 465,                   // Secure SMTP port for Gmail
  secure: true,                // Use TLS (secure connection)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // To handle any certificate issues
  },
});

/**
 * 📧 Route to Send Emails
 */
app.post('/send-email', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const loginUrl = "https://yourwebsite.com/login"; // Change this URL

    const mailOptions = {
        from: `"Your Company" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to the Company! Your Login Credentials",
        html: `
            <h2>Welcome to Our System!</h2>
            <p>Your login details:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>Please change your password after logging in.</p>
            <a href="${loginUrl}" 
               style="display:inline-block;padding:10px 20px;color:#fff;background-color:#007bff;text-decoration:none;border-radius:5px;">
               Login Now
            </a>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${email}`);
        res.status(200).json({ message: `Email sent to ${email}` });
    } catch (error) {
        console.error("❌ Error sending email:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

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
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔗 GraphQL: http://localhost:${port}/graphql`);
});