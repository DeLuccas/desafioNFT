import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs, resolvers, createContext } from "./schema.js";

async function bootstrap() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(cors());
  app.use(bodyParser.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/graphql", expressMiddleware(server, { context: createContext }));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`GraphQL em http://localhost:${PORT}/graphql`)
  );
}

bootstrap();
