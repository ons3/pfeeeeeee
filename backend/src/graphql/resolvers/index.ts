import { projetResolvers } from "./projetResolvers";
import { equipeResolvers } from "./equipeResolvers";
import { projetEquipeSchema } from "./projetEquipeSchema";
import { tacheResolvers } from "./tacheResolvers";
import { adminResolvers } from "./administrateurResolvers"; // Vérifie la casse
import { alertResolvers } from "./alertResolvers";
import { suiviDeTempsResolvers } from "./suiviDeTempsResolvers";
import { employeeResolvers } from "./employeeResolvers";

export const resolvers = {
  Query: {
    ...projetResolvers.Query,
    ...equipeResolvers.Query,
    ...tacheResolvers.Query,
    ...adminResolvers.Query,
    ...alertResolvers.Query,
    ...suiviDeTempsResolvers.Query,
    ...employeeResolvers.Query, // Ensure Query exists
  },
  Mutation: {
    ...projetResolvers.Mutation,
    ...equipeResolvers.Mutation,
    ...projetEquipeSchema.Mutation,
    ...tacheResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...alertResolvers.Mutation,
    ...suiviDeTempsResolvers.Mutation,
    ...(employeeResolvers.Mutation || {}), // Add fallback for Mutation
  },
};
