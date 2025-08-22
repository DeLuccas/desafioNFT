import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs, resolvers, createContext } from "./schema.js";

async function bootstrap() {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError(formattedError) {
      return formattedError; // manter formato padrão
    },
  });
  await server.start();

  app.use(cors());
  app.use(bodyParser.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/graphql", async (req, res, next) => {
    // intercepta para capturar send
    let originalJson = res.json.bind(res);
    (res as any).json = (body: any) => {
      if (body && body.errors && res.statusCode < 400) {
        res.status(500);
      }
      return originalJson(body);
    };
    return expressMiddleware(server, { context: createContext })(
      req,
      res,
      next
    );
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`GraphQL em http://localhost:${PORT}/graphql`)
  );
}

bootstrap();
