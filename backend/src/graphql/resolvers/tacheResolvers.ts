import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { projetResolvers } from './projetResolvers'; // Assuming you have projet resolvers to get project data
import { administrateurResolvers } from './administrateurResolvers'; // Assuming you have administrateur resolvers to get administrator data

export const tacheResolvers = {
  Query: {
    taches: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT 
            t.idTache, 
            t.titre_tache, 
            t.description_tache, 
            t.date_debut_tache, 
            t.date_fin_tache, 
            t.statut_tache, 
            t.idProjet, 
            p.nom_projet AS projet_name, 
            p.description_projet AS projet_description,
            t.idAdministrateur, 
            a.nom_administrateur AS administrateur_name
          FROM Taches t
          LEFT JOIN Projects p ON t.idProjet = p.idProjet
          LEFT JOIN Administrateurs a ON t.idAdministrateur = a.idAdministrateur
        `);

        return result.recordset.map(tach => ({
          ...tach,
          projet: tach.idProjet ? {
              idProjet: tach.idProjet,
              nom_projet: tach.projet_name,
              description_projet: tach.projet_description,
            } : null,
          administrateur: tach.idAdministrateur ? {
              idAdministrateur: tach.idAdministrateur,
              nom_administrateur: tach.administrateur_name,
            } : null,
        }));
      } catch (error) {
        console.error("Error fetching taches:", error);
        throw new Error("Error fetching taches");
      }
    },

    tache: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              t.idTache, 
              t.titre_tache, 
              t.description_tache, 
              t.date_debut_tache, 
              t.date_fin_tache, 
              t.statut_tache, 
              t.idProjet, 
              p.nom_projet AS projet_name, 
              p.description_projet AS projet_description,
              t.idAdministrateur, 
              a.nom_administrateur AS administrateur_name
            FROM Taches t
            LEFT JOIN Projects p ON t.idProjet = p.idProjet
            LEFT JOIN Administrateurs a ON t.idAdministrateur = a.idAdministrateur
            WHERE t.idTache = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error("Tache not found");
        }

        const tach = result.recordset[0];
        return {
          ...tach,
          projet: tach.idProjet ? {
              idProjet: tach.idProjet,
              nom_projet: tach.projet_name,
              description_projet: tach.projet_description,
            } : null,
          administrateur: tach.idAdministrateur ? {
              idAdministrateur: tach.idAdministrateur,
              nom_administrateur: tach.administrateur_name,
            } : null,
        };
      } catch (error) {
        console.error("Error fetching tache:", error);
        throw new Error("Error fetching tache");
      }
    },

    // New resolver for searching tasks (taches)
    searchTaches: async (
      _: any,
      { filters }: { filters?: { titre_tache?: string; statut_tache?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT 
            t.idTache, 
            t.titre_tache,
            t.description_tache,
            t.date_debut_tache,
            t.date_fin_tache,
            t.statut_tache,
            t.idProjet,
            p.nom_projet AS projet_name,
            p.description_projet AS projet_description,
            t.idAdministrateur,
            a.nom_administrateur AS administrateur_name
          FROM Taches t
          LEFT JOIN Projects p ON t.idProjet = p.idProjet
          LEFT JOIN Administrateurs a ON t.idAdministrateur = a.idAdministrateur
        `;
        
        const conditions = [];
        const inputs = [];

        // Add filters dynamically based on provided arguments
        if (filters?.titre_tache) {
          conditions.push("t.titre_tache LIKE @titre_tache");
          inputs.push({ name: "titre_tache", type: sql.VarChar, value: `%${filters.titre_tache}%` });
        }

        if (filters?.statut_tache) {
          conditions.push("t.statut_tache = @statut_tache");
          inputs.push({ name: "statut_tache", type: sql.VarChar, value: filters.statut_tache });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        
        return result.recordset.map(t => ({
          ...t,
          projet : t.idProjet ? {
             idProjet :t.idProjet ,
             nom_projet :t.projet_name ,
             description_projet :t.projet_description ,
           } : null,
          administrateur : t.idAdministrateur ? {
             idAdministrateur :t.idAdministrateur ,
             nom_administrateur :t.administrateur_name ,
           } : null
         }));
        
      } catch (error) {
        console.error("Error searching tasks:", error);
        throw new Error("Error searching tasks");
      }
    }
  },
  Mutation: {
    createTache: async (
      _: any,
      { titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, idProjet, idAdministrateur }: {
        titre_tache: string;
        description_tache?: string;
        date_debut_tache: string;
        date_fin_tache?: string;
        statut_tache: 'TODO' | 'IN_PROGRESS' | 'END';
        idProjet: string;
        idAdministrateur: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idTache = uuidv4();

        await pool.request()
          .input('idTache', sql.UniqueIdentifier, idTache)
          .input('titre_tache', sql.VarChar, titre_tache)
          .input('description_tache', sql.VarChar, description_tache || '')
          .input('date_debut_tache', sql.VarChar, date_debut_tache)
          .input('date_fin_tache', sql.VarChar, date_fin_tache || null)
          .input('statut_tache', sql.VarChar, statut_tache)
          .input('idProjet', sql.UniqueIdentifier, idProjet || null)
          .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur || null)
          .query(`
            INSERT INTO Taches (idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, idProjet, idAdministrateur)
            VALUES (@idTache, @titre_tache, @description_tache, @date_debut_tache, @date_fin_tache, @statut_tache, @idProjet, @idAdministrateur);
          `);

        return {
          idTache,
          titre_tache,
          description_tache,
          date_debut_tache,
          date_fin_tache,
          statut_tache
        };
      } catch (error) {
        console.error("Error creating tache:", error);
        throw new Error("Error creating tache");
      }
    },

    updateTache: async (
      _: any,
      { id, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache }: {
        id: string;
        titre_tache?: string;
        description_tache?: string;
        date_debut_tache?: string;
        date_fin_tache?: string;
        statut_tache?: 'TODO' | 'IN_PROGRESS' | 'END';
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates: string[] = [];

        if (titre_tache) {
          updates.push('titre_tache = @titre_tache');
          request.input('titre_tache', sql.VarChar, titre_tache);
        }

        if (description_tache) {
          updates.push('description_tache = @description_tache');
          request.input('description_tache', sql.VarChar, description_tache);
        }

        if (date_debut_tache) {
          updates.push('date_debut_tache = @date_debut_tache');
          request.input('date_debut_tache', sql.VarChar, date_debut_tache);
        }

        if (date_fin_tache) {
          updates.push('date_fin_tache = @date_fin_tache');
          request.input('date_fin_tache', sql.VarChar, date_fin_tache);
        }

        if (statut_tache) {
          updates.push('statut_tache = @statut_tache');
          request.input('statut_tache', sql.VarChar, statut_tache);
        }

        const query = `
          UPDATE Taches
          SET ${updates.join(', ')}
          WHERE idTache = @id;
        `;

        await request.query(query);

        return {
          id,
          titre_tache,
          description_tache,
          date_debut_tache,
          date_fin_tache,
          statut_tache
        };
      } catch (error) {
        console.error("Error updating tache:", error);
        throw new Error("Error updating tache");
      }
    },

    deleteTache: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Taches WHERE idTache = @id;
        `);

        return `Tache with ID ${id} deleted successfully`;
      } catch (error) {
        console.error("Error deleting tache:", error);
        throw new Error("Error deleting tache");
      }
    }
  }
};
