import { projectResolvers } from "./projectResolvers";
import { equipeResolvers } from "./equipeResolvers";
import { relationshipResolvers } from "./relationshipResolvers";
import { tacheResolvers } from "./tacheResolvers";
import { utilisateurResolvers } from "./utilisateurResolvers";
import { alertResolvers } from "./alertResolvers";
import { suiviDeTempsResolvers } from "./suiviDeTempsResolvers";




export const resolvers = {
  Query: {
    ...projectResolvers.Query,
    ...equipeResolvers.Query,
    ...tacheResolvers.Query,
    ...utilisateurResolvers.Query,
    ...alertResolvers.Query,
    ...suiviDeTempsResolvers.Query,

  },
  Mutation: {
    ...projectResolvers.Mutation,
    ...equipeResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...tacheResolvers.Mutation,
    ...utilisateurResolvers.Mutation,
    ...alertResolvers.Mutation,
    ...suiviDeTempsResolvers.Mutation
  },
};