/* eslint-env node */
/* eslint compat/compat: 0 */

import { makeExecutableSchema } from 'graphql-tools';

import qs from 'qs';
import _ from 'lodash';
import process from 'process';

import Image, { resolvers as imageResolvers } from './types/Image';
import Gallery, { resolvers as galleryResolvers } from './types/Gallery';
import PageInfo from './types/PageInfo';

import { fetch, globalCookies, categoryEnumQueryFieldMap } from './utils';

require('dotenv').config({ path: `${__dirname}/../.env` });

const logOnToEH = async (UserName, PassWord) => {
  const loginResponse = await fetch(
    'https://forums.e-hentai.org/index.php?act=Login&CODE=01&CookieDate=1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: qs.stringify({
        UserName,
        PassWord,
        referer: 'act=Login&CODE=01&CookieDate=1',
      }),
    },
  );
  // Get cookies for later.
  loginResponse.headers.getAll('Set-Cookie').forEach(setCookie => {
    const [key, value] = setCookie.split('; ')[0].split('=', 2);
    globalCookies[key] = value;
  });

  const html = await loginResponse.text();

  if (html.indexOf('<p>You are now logged in as:') === -1) {
    throw new Error('Failed to sign into EH');
  }
  return loginResponse;
};

const { EXHENTAI_USERNAME, EXHENTAI_PASSWORD } = process.env;
logOnToEH(EXHENTAI_USERNAME, EXHENTAI_PASSWORD).then(() => console.log('Signed into EH'));

// Construct a schema, using GraphQL schema language
const typeDefs = `
  enum Category {
    DOUJINSHI
    MANGA
    ARTISTCG
    GAMECG
    WESTERN
    NONH
    IMAGESET
    COSPLAY
    ASIANPORN
    MISC
  }
  type Query {
    getCategories: [Category]
  }
  type Mutation {
    noop: Boolean
  }
`;
// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    getCategories: () => Object.keys(categoryEnumQueryFieldMap),
  },
};

export default makeExecutableSchema({
  typeDefs: [typeDefs, Image, Gallery, PageInfo],
  resolvers: _.merge(resolvers, imageResolvers, galleryResolvers),
  //  logger: console
});
