import { gql } from "apollo-server-express";
import { projetTypeDefs } from "./projetSchema";
import { equipeTypeDefs } from "./equipeSchema";
import { projetEquipeTypeDefs } from "./projetEquipeSchema";
import { tacheTypeDefs } from "./tacheSchema";
import { employeeTypeDefs } from "./employeeSchema";
import { alertTypeDefs } from "./alertSchema";
import { suiviDeTempTypeDefs } from "./suiviDeTempsSchema";
import { adminTypeDefs } from "./administrateurSchema";
import { superviseurTypeDefs } from "./superviseurSchema";



// Combine all type definitions into one
export const typeDefs = gql`
  scalar Date

  enum StatutProject {
    TODO
    IN_PROGRESS
    END
  }

  # Define the Query type
  type Query {
    _empty: String  # Placeholder field (required if Query is empty)
  }

  # Define the Mutation type
  type Mutation {
    _empty: String  # Placeholder field (required if Mutation is empty)
  }

  # Include all the imported type definitions
  ${projetTypeDefs}
  ${equipeTypeDefs}
  ${projetEquipeTypeDefs}
  ${employeeTypeDefs}
  ${tacheTypeDefs}
  ${alertTypeDefs}
  ${suiviDeTempTypeDefs}
  ${adminTypeDefs}
  ${superviseurTypeDefs}
`;
