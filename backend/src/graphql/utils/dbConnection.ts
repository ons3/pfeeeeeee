import sql, { ConnectionPool } from 'mssql';

// SQL Server configuration
const config = {
<<<<<<< HEAD
<<<<<<< Updated upstream
  user: 'SA',
=======
  user: 'sa',
>>>>>>> Stashed changes
  password: 'YourPassword123!',
=======
  user: 'sa',
  password: 'Ons17082001',
>>>>>>> main

  server: 'localhost',
  database: 'time_tracking',
  options: {
    encrypt: true, // Use encryption if required
    trustServerCertificate: true, // Change to true for local development
  },
};

let pool: ConnectionPool;

// Function to establish a connection to the database
export const connectToDatabase = async (): Promise<void> => {
  try {
    pool = await sql.connect(config);
    console.log('Connected to the database.');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
};

// Export the pool connection to be used in resolvers
export const getPool = (): ConnectionPool => pool;

