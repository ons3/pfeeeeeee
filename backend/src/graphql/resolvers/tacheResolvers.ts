import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const tacheResolvers = {
  Query: {
    taches: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
          FROM Tache
        `);

        return result.recordset.map((tache) => ({
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
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
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @id
          `);

        if (result.recordset.length === 0) {
          throw new Error("Tache not found");
        }

        const tache = result.recordset[0];
        return {
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        };
      } catch (error) {
        console.error("Error fetching tache:", error);
        throw new Error("Error fetching tache");
      }
    },

    searchTaches: async (
      _: any,
      { filters }: { filters?: { titreTache?: string; statutTache?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
          FROM Tache
        `;
        const conditions = [];
        const inputs = [];

        if (filters?.titreTache) {
          conditions.push("titre_tache LIKE @titreTache");
          inputs.push({ name: "titreTache", type: sql.NVarChar, value: `%${filters.titreTache}%` });
        }

        if (filters?.statutTache) {
          conditions.push("statut_tache = @statutTache");
          inputs.push({ name: "statutTache", type: sql.NVarChar, value: filters.statutTache });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);

        return result.recordset.map((tache) => ({
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        }));
      } catch (error) {
        console.error("Error searching taches:", error);
        throw new Error("Error searching taches");
      }
    },
  },

  Mutation: {
    createTache: async (
      _: any,
      { titreTache, descriptionTache, duration, idProjet, dateDebutTache, dateFinTache }: {
        titreTache: string;
        descriptionTache?: string;
        duration: number;
        idProjet: string;
        dateDebutTache?: string;
        dateFinTache?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idTache = uuidv4();

        await pool.request()
          .input('idTache', sql.UniqueIdentifier, idTache)
          .input('titre_tache', sql.NVarChar, titreTache)
          .input('description_tache', sql.NVarChar, descriptionTache || null)
          .input('duration', sql.Int, duration)
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('date_debut_tache', sql.DateTime, dateDebutTache ? new Date(dateDebutTache) : null)
          .input('date_fin_tache', sql.DateTime, dateFinTache ? new Date(dateFinTache) : null)
          .query(`
            INSERT INTO Tache (idTache, titre_tache, description_tache, duration, idProjet, date_debut_tache, date_fin_tache)
            VALUES (@idTache, @titre_tache, @description_tache, @duration, @idProjet, @date_debut_tache, @date_fin_tache)
          `);

        // Fetch the newly created tache to return it
        const newTache = await pool.request()
          .input('idTache', sql.UniqueIdentifier, idTache)
          .query(`
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @idTache
          `);

        const tache = newTache.recordset[0];

        return {
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: tache.date_debut_tache ? new Date(tache.date_debut_tache).toISOString() : null,
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet
        };
      } catch (error) {
        console.error("Error creating tache:", error);
        throw new Error("Error creating tache");
      }
    },

    updateTache: async (
      _: any,
      { id, titreTache, descriptionTache, statutTache, duration, idProjet, dateDebutTache, dateFinTache }: {
        id: string;
        titreTache?: string;
        descriptionTache?: string;
        statutTache?: string;
        duration?: number;
        idProjet?: string;
        dateDebutTache?: string;
        dateFinTache?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates = [];
    
        if (titreTache !== undefined) {
          updates.push('titre_tache = @titreTache');
          request.input('titreTache', sql.NVarChar, titreTache);
        }
    
        if (descriptionTache !== undefined) {
          updates.push('description_tache = @descriptionTache');
          request.input('descriptionTache', sql.NVarChar, descriptionTache);
        }
    
        if (statutTache !== undefined) {
          updates.push('statut_tache = @statutTache');
          request.input('statutTache', sql.NVarChar, statutTache);
        }
    
        if (duration !== undefined) {
          updates.push('duration = @duration');
          request.input('duration', sql.Int, duration);
        }
    
        if (idProjet !== undefined && idProjet !== null) {
          updates.push('idProjet = @idProjet');
          request.input('idProjet', sql.UniqueIdentifier, idProjet);
        }
        
        if (dateDebutTache !== undefined) {
          updates.push('date_debut_tache = @dateDebutTache');
          request.input('dateDebutTache', sql.DateTime, dateDebutTache ? new Date(dateDebutTache) : null);
        }
        
        if (dateFinTache !== undefined) {
          updates.push('date_fin_tache = @dateFinTache');
          request.input('dateFinTache', sql.DateTime, dateFinTache ? new Date(dateFinTache) : null);
        }
    
        if (updates.length === 0) {
          throw new Error("No updates provided");
        }
    
        const query = `
          UPDATE Tache
          SET ${updates.join(', ')}
          WHERE idTache = @id
        `;
    
        await request.query(query);
        
        // Fetch the updated tache
        const updatedTacheResult = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet
            FROM Tache
            WHERE idTache = @id
          `);

        if (updatedTacheResult.recordset.length === 0) {
          throw new Error("Tache not found after update");
        }

        const updatedTache = updatedTacheResult.recordset[0];

        return {
          idTache: updatedTache.idTache,
          titreTache: updatedTache.titre_tache,
          descriptionTache: updatedTache.description_tache,
          dateDebutTache: updatedTache.date_debut_tache ? new Date(updatedTache.date_debut_tache).toISOString() : null,
          dateFinTache: updatedTache.date_fin_tache ? new Date(updatedTache.date_fin_tache).toISOString() : null,
          statutTache: updatedTache.statut_tache,
          duration: updatedTache.duration,
          idProjet: updatedTache.idProjet
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
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM Tache WHERE idTache = @id
          `);

        return `Tache with ID ${id} deleted successfully`;
      } catch (error) {
        console.error("Error deleting tache:", error);
        throw new Error("Error deleting tache");
      }
    },
  },

  Tache: {
    projet: async (parent: { idProjet: string }, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      if (!parent.idProjet) return null;

      try {
        const result = await pool.request()
          .input("idProjet", sql.UniqueIdentifier, parent.idProjet)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet
            FROM Projet
            WHERE idProjet = @idProjet
          `);

        if (result.recordset.length === 0) return null;

        return {
          idProjet: result.recordset[0].idProjet,
          nom_projet: result.recordset[0].nom_projet,
          description_projet: result.recordset[0].description_projet,
          date_debut_projet: result.recordset[0].date_debut_projet,
          date_fin_projet: result.recordset[0].date_fin_projet,
          statut_projet: result.recordset[0].statut_projet
        };
      } catch (error) {
        console.error("Error fetching project:", error);
      }
    }
  }
};