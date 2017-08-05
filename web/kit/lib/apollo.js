// ----------------------
// IMPORTS

// Apollo client library
import { createNetworkInterface, ApolloClient } from 'react-apollo';
import { toIdValue } from 'apollo-client';

// Custom configuration/settings
import { APOLLO } from 'config/project';

// ----------------------

// Create a new Apollo network interface, to point to our API server.
// Note:  By default in this kit, we'll connect to a sample endpoint that
// repsonds with simple messages.  Update [root]/config.js as needed.
const networkInterface = createNetworkInterface({
  uri: APOLLO.uri,
});

const dataIdFromObject = ({ __typename, id }) => __typename && id && `${__typename}:${id}`;

// Helper function to create a new Apollo client, by merging in
// passed options alongside the defaults
function createClient(opt = {}) {
  return new ApolloClient(
    Object.assign(
      {
        reduxRootSelector: state => state.apollo,
        dataIdFromObject,
        customResolvers: {
          Query: {
            getImage: (_, { galleryId, pageNumber }) =>
              toIdValue(
                dataIdFromObject({ __typename: 'Image', id: `${galleryId}-${pageNumber + 1}` }),
              ),
            getGallery: (_, { id }) =>
              toIdValue(
                dataIdFromObject({ __typename: 'Gallery', id }),
              ),
          },
        },
        networkInterface,
      },
      opt,
    ),
  );
}

// Creates a new browser client
export function browserClient() {
  return createClient();
}

// Creates a new server-side client
export function serverClient() {
  return createClient({
    ssrMode: true,
  });
}
