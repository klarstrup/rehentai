import DataLoader from 'dataloader';
import cheerio from 'cheerio';
import R from 'ramda';

import { fetch, idTokenPageNumberFromImageUrl } from '../utils';

import PageInfo from './PageInfo';

const imageFetcher = ({ galleryId, token, pageNumber = 0 }) =>
  fetch(`http://exhentai.org/s/${token}/${galleryId}-${1 + pageNumber}`).then(res =>
    res.text().then(html => {
      const $ = cheerio.load(html);

      const [name, resolution, size] = $('div', '#i2')
        .last()
        .text()
        .split(' :: ');
      const [fileWidth, fileHeight] = resolution.split(' x ').map(d => +d);

      if (
        $('#img')
          .attr('src')
          .substr(-7) === '509.gif'
      ) {
        throw new Error('EH: 509 Bandwidth Exceeded');
      }

      return {
        ...idTokenPageNumberFromImageUrl(res.url),
        fileUrl: $('#img').attr('src'),
        url: res.url,
        name,
        fileWidth,
        fileHeight,
        fileSize: +size.split(' ')[0],
        nextImage: idTokenPageNumberFromImageUrl(
          $('#next')
            .first()
            .attr('href'),
        ),
        previousImage: idTokenPageNumberFromImageUrl(
          $('#prev')
            .first()
            .attr('href'),
        ),
        firstImage: idTokenPageNumberFromImageUrl(
          $('a', '#i2')
            .first()
            .attr('href'),
        ),
        lastImage: idTokenPageNumberFromImageUrl(
          $('a', '#i2')
            .last()
            .attr('href'),
        ),
      };
    }),
  );

const imageLoader = new DataLoader(idTokenPairs => Promise.all(idTokenPairs.map(imageFetcher)), {
  cacheKeyFn: ({ galleryId, token, pageNumber }) =>
    JSON.stringify({ galleryId, token, pageNumber }),
});

const someFunction = () => (obj, dunno, context, ast) => {
  const { path: { key },fieldNodes: [{ selectionSet: { selections } }] } = ast;
  const wantedFields = selections.map(f=>f.name.value).filter(f=>f!=='__typename');

  if (obj[key]) {
    if (R.all(f=>R.contains(f)(Object.keys(obj[key])))(wantedFields)) {
      return obj[key];
    }

    return imageLoader.load(obj[key]);
  }
  const { galleryId, token, pageNumber } = obj;
  return imageLoader
    .load({ galleryId, token, pageNumber })
    .then(image => imageLoader.load(image[key]));
};

const Image = `
  type Image {
    id: String
    galleryId: Int
    token: String
    pageNumber: Int
    name: String
    url: String
    fileWidth: Int
    fileHeight: Int
    fileSize: Float
    fileUrl: String
    thumbnailUrl: String
    nextImage: Image
    previousImage: Image
    firstImage: Image
    lastImage: Image
  }
  type ImagesPage {
    pageInfo: PageInfo
    images(limit: Int, start: Int): [Image]
  }
  extend type Query {
    getImage(galleryId: Int!, token: String!, pageNumber: Int!): Image
  }
  extend type Mutation {
    refreshImage(galleryId: Int!, token: String!, pageNumber: Int!): Image
  }
`;

export const resolvers = {
  Query: {
    getImage: (root, { galleryId, token, pageNumber }) =>
      imageLoader.load({ galleryId, token, pageNumber }),
  },
  Mutation: {
    refreshImage: (root, { galleryId, token, pageNumber }) =>
      imageLoader.clear({ galleryId, token, pageNumber }).load({ galleryId, token, pageNumber }),
  },
  ImagesPage: {
    images: ({ images }, { limit, start = 0 }) => images.slice(start, limit),
  },
  Image: {
    fileUrl: ({ galleryId, token, pageNumber, fileUrl }) =>
      fileUrl || imageLoader.load({ galleryId, token, pageNumber }).then(R.prop('fileUrl')),
    nextImage: someFunction('nextImage'),
    lastImage: someFunction('lastImage'),
    firstImage: someFunction('firstImage'),
    previousImage: someFunction('previousImage'),
  },
};

export default () => [Image, PageInfo];
