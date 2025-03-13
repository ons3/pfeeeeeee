import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const tacheResolvers = {
  Query: {
    taches: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet, idAdministrateur
          FROM Tache
        `);

        return result.recordset.map((tache) => ({
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: new Date(tache.date_debut_tache).toISOString(),
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet,
          idAdministrateur: tache.idAdministrateur,
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
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet, idAdministrateur
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
          dateDebutTache: new Date(tache.date_debut_tache).toISOString(),
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet,
          idAdministrateur: tache.idAdministrateur,
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
          SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet, idAdministrateur
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
          dateDebutTache: new Date(tache.date_debut_tache).toISOString(),
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet,
          idAdministrateur: tache.idAdministrateur,
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
      { titreTache, descriptionTache, duration, idProjet, idAdministrateur }: {
        titreTache: string;
        descriptionTache?: string;
        duration: number;
        idProjet: string;
        idAdministrateur: string;
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
          .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur)
          .query(`
            INSERT INTO Tache (idTache, titre_tache, description_tache, duration, idProjet, idAdministrateur)
            VALUES (@idTache, @titre_tache, @description_tache, @duration, @idProjet, @idAdministrateur)
          `);

        // Fetch the newly created tache to return it
        const newTache = await pool.request()
            .input('idTache', sql.UniqueIdentifier, idTache)
            .query(`
                SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet, idAdministrateur
                FROM Tache
                WHERE idTache = @idTache
            `);

        const tache = newTache.recordset[0];

        return {
          idTache: tache.idTache,
          titreTache: tache.titre_tache,
          descriptionTache: tache.description_tache,
          dateDebutTache: new Date(tache.date_debut_tache).toISOString(),
          dateFinTache: tache.date_fin_tache ? new Date(tache.date_fin_tache).toISOString() : null,
          statutTache: tache.statut_tache,
          duration: tache.duration,
          idProjet: tache.idProjet,
          idAdministrateur: tache.idAdministrateur
        };
      } catch (error) {
        console.error("Error creating tache:", error);
        throw new Error("Error creating tache");
      }
    },

    updateTache: async (
      _: any,
      { id, titreTache, descriptionTache, statutTache, duration }: {
        id: string;
        titreTache?: string;
        descriptionTache?: string;
        statutTache?: string;
        duration?: number;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates = [];

        if (titreTache) {
          updates.push('titre_tache = @titreTache');
          request.input('titreTache', sql.NVarChar, titreTache);
        }

        if (descriptionTache) {
          updates.push('description_tache = @descriptionTache');
          request.input('descriptionTache', sql.NVarChar, descriptionTache);
        }

        if (statutTache === 'END') {
           updates.push('date_fin_tache = GETDATE()');
        }

        if (statutTache) {
          updates.push('statut_tache = @statutTache');
          request.input('statutTache', sql.NVarChar, statutTache);
        }
        if (duration) {
            updates.push('duration = @duration');
            request.input('duration', sql.Int, duration);
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
            SELECT idTache, titre_tache, description_tache, date_debut_tache, date_fin_tache, statut_tache, duration, idProjet, idAdministrateur
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
          dateDebutTache: new Date(updatedTache.date_debut_tache).toISOString(),
          dateFinTache: updatedTache.date_fin_tache ? new Date(updatedTache.date_fin_tache).toISOString() : null,
          statutTache: updatedTache.statut_tache,
          duration: updatedTache.duration,
          idProjet: updatedTache.idProjet,
          idAdministrateur: updatedTache.idAdministrateur,
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
};
