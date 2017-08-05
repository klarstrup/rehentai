import express from "express";
import { graphqlExpress, graphiqlExpress } from "graphql-server-express";
import bodyParser from "body-parser";
import cors from "cors";

import { schema, rootValue, context } from "./schema";

const PORT = 3000;
const server = express();

server.use(
  "/graphql",
  cors(),
  bodyParser.json(),
  graphqlExpress(request => ({
    schema,
    rootValue,
    context: context(request.headers, process.env)
  }))
);

server.use(
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/graphql",
    query: `# Welcome to GraphiQL

{
  getGalleries {
    uploader
    title
    tags
    category
    url
#    pages {
#      id
#      token
#      url
#      no
#      name
#    }
  }
}
`
  })
);

server.listen(PORT, () => {
  console.log(
    `GraphQL Server is now running on http://localhost:${PORT}/graphql`
  );
  console.log(`View GraphiQL at http://localhost:${PORT}/graphiql`);
});
