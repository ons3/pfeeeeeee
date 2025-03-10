import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const utilisateurResolvers = {
  Query: {
    searchUtilisateurs: async (_: any, { filters }: { filters: { nom_utilisateur?: string; email_utilisateur?: string; role_utilisateur?: string } }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `
          SELECT IdUtilisateur, IdEquipe, nom_utilisateur, email_utilisateur, role_utilisateur, password_hash
          FROM Utilisateur
        `;
        const conditions: string[] = [];
        const request = pool.request();

        if (filters.nom_utilisateur) {
          conditions.push("nom_utilisateur LIKE @nom_utilisateur");
          request.input("nom_utilisateur", sql.VarChar, `%${filters.nom_utilisateur}%`);
        }

        if (filters.email_utilisateur) {
          conditions.push("email_utilisateur LIKE @email_utilisateur");
          request.input("email_utilisateur", sql.VarChar, `%${filters.email_utilisateur}%`);
        }

        if (filters.role_utilisateur) {
          conditions.push("role_utilisateur = @role_utilisateur");
          request.input("role_utilisateur", sql.VarChar, filters.role_utilisateur);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const result = await request.query(query);
        return result.recordset;
      } catch (error) {
        console.error("Error searching utilisateurs:", error);
        throw new Error("Error searching utilisateurs");
      }
    },

    utilisateurs: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT IdUtilisateur, IdEquipe, nom_utilisateur, email_utilisateur, role_utilisateur, password_hash
          FROM Utilisateur;
        `);
        return result.recordset;
      } catch (error) {
        console.error('Error fetching utilisateurs:', error);
        throw new Error('Error fetching utilisateurs');
      }
    },

    utilisateur: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id);
        const result = await request.query(`
          SELECT IdUtilisateur, IdEquipe, nom_utilisateur, email_utilisateur, role_utilisateur, password_hash
          FROM Utilisateur
          WHERE IdUtilisateur = @id;
        `);

        if (result.recordset.length === 0) {
          throw new Error('Utilisateur not found');
        }
        return result.recordset[0];
      } catch (error) {
        console.error('Error fetching utilisateur:', error);
        throw new Error('Error fetching utilisateur');
      }
    },
  },

  Mutation: {
    createUtilisateur: async (
        _: any,
        { nom_utilisateur, email_utilisateur, role_utilisateur, password_hash, IdEquipe }: 
        { nom_utilisateur: string; email_utilisateur: string; role_utilisateur: string; password_hash: string; IdEquipe: string },
        { pool }: { pool: sql.ConnectionPool }
      ) => {
        try {
          // Check if email already exists
          const checkEmailResult = await pool.request()
            .input('email_utilisateur', sql.VarChar, email_utilisateur)
            .query(`
              SELECT COUNT(*) AS emailCount
              FROM Utilisateur
              WHERE email_utilisateur = @email_utilisateur;
            `);
      
          const emailCount = checkEmailResult.recordset[0].emailCount;
      
          if (emailCount > 0) {
            throw new Error(`Email ${email_utilisateur} already exists. Please choose a different email.`);
          }
      
          // Proceed with insert if email is not duplicate
          const result = await pool.request()
            .input('IdEquipe', sql.UniqueIdentifier, IdEquipe) 
            .input('nom_utilisateur', sql.VarChar, nom_utilisateur) 
            .input('email_utilisateur', sql.VarChar, email_utilisateur) 
            .input('role_utilisateur', sql.VarChar, role_utilisateur) 
            .input('password_hash', sql.VarChar, password_hash) 
            .query(`
              INSERT INTO Utilisateur (IdEquipe, nom_utilisateur, email_utilisateur, role_utilisateur, password_hash)
              VALUES (@IdEquipe, @nom_utilisateur, @email_utilisateur, @role_utilisateur, @password_hash);
      
              SELECT SCOPE_IDENTITY() AS IdUtilisateur;
            `);
      
          const { IdUtilisateur } = result.recordset[0];
      
          return {
            IdUtilisateur,
            nom_utilisateur,
            email_utilisateur,
            role_utilisateur,
            password_hash,
          };
        } catch (error) {
          console.error('Error creating utilisateur:', error);
          if (error instanceof Error) {
            throw new Error(error.message || 'Error creating utilisateur');
          } else {
            throw new Error('Error creating utilisateur');
          }
        }
      }
      
    ,      

    deleteUtilisateur: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id);
        await request.query(`DELETE FROM Utilisateur WHERE IdUtilisateur = @id`);

        return {
          success: true,
          message: 'Utilisateur deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting utilisateur:', error);
        return {
          success: false,
          message: 'Error deleting utilisateur',
        };
      }
    },
  },
};
