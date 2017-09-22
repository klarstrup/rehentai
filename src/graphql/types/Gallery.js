import DataLoader from 'dataloader';
import cheerio from 'cheerio';
import R from 'ramda';
import qs from 'qs';

import { fetch, idTokenPageNumberFromImageUrl, categoryEnumQueryFieldMap } from '../utils';

import db, { upsert } from '../db';

import PageInfo from './PageInfo';

const upsertGallery = object => upsert({ table: 'gallery', key: 'id', object });

const galleryFilterCategoriesToQueryObject = R.reduce(
  (acc, cat) => ({ ...acc, [categoryEnumQueryFieldMap[cat]]: 1 }),
  {},
);

const galleryFilterToQueryString = ({ search = '', page = 0, category, categories = [category] }) =>
  qs.stringify({
    page,
    f_search:
      (search &&
        R.sortBy(R.identity)(
          search.match(/(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g),
        ).join(' ')) ||
      '',
    ...galleryFilterCategoriesToQueryObject(categories),
    f_apply: 'Apply Filter',
  });

const backgroundPositionToStars = backgroundPosition => {
  let stars = 5;

  const regexp = /([+-]?\d+)(.*?)([+-]?\d+)/i;
  const m = regexp.exec(backgroundPosition);
  if (m === null) {
    return null;
  }
  const horizontal = -parseInt(m[1], 10);
  const vertical = -parseInt(m[3], 10);

  if (vertical === 21) {
    stars -= 0.5;
  }

  stars -= horizontal / 16;

  return stars;
};

const galleryFetcher = ({ id, token, page = 0 }) =>
  fetch(`http://exhentai.org/g/${id}/${token}/?p=${page}`).then(res =>
    res.text().then(html => {
      const $ = cheerio.load(html);

      if (html.indexOf('<p>This gallery has been removed or is unavailable.</p>') > 0) {
        throw new Error('EH: This gallery has been removed or is unavailable.');
      }

      const total = +$('.gpc')
        .text()
        .split(' ')
        .slice(-2)[0]
        .replace(',', '');

      const perPage = 20;

      return {
        id,
        token,
        title: $('#gn').text(),
        url: `http://exhentai.org/g/${id}/${token}/`,
        thumbnailUrl: /.*((?:http|https)(?::\/{2}[\w]+)(?:[\/|\.]?)(?:[^\s)"]*))/g
          .exec($('div', '#gd1').css('background'))[1]
          .replace('exhentai', 'ehgt'),
        favorite: $('#favoritelink').text() || null,
        rating: $('#rating_label')
          .text()
          .substr(-4),
        uploader: $('a', '#gdn')
          .first()
          .text(),
        category: $('a', '#gdc')
          .first()
          .attr('href')
          .split('/')
          .slice(-1)[0],
        published: Date.parse(
          `${$('.gdt2')
            .first()
            .text()} EDT`,
        ),
        tags: $('a', '#taglist').map((i, el) =>
          $(el)
            .attr('id')
            .substr(3),
        ),
        imagesPage: {
          pageInfo: {
            total,
            count: $('a', '#gdt').length,
            page,
            perPage,
            hasNextPage: Math.ceil(total / perPage) - 1 > page,
            hasPrevPage: page > 0,
          },
          images: $('a', '#gdt').map((i, el) => ({
            ...idTokenPageNumberFromImageUrl($(el).attr('href')),
            url: $(el).attr('href'),
            thumbnailUrl: $('img', el)
              .attr('src')
              .replace('exhentai', 'ehgt'),
            name: $('img', el)
              .attr('title')
              .split(' ', 3)[2],
          })),
        },
      };
    }),
  );

const galleriesFetcher = galleryFilterQueryString =>
  fetch(`http://exhentai.org/?${galleryFilterQueryString}`)
    .then(res => res.text())
    .then(html => {
      const $ = cheerio.load(html);

      if (
        html.indexOf(
          '<p style="text-align:center; font-style:italic; margin-bottom:10px">No hits found</p>',
        ) > 0
      ) {
        return {
          galleries: [],
          pageInfo: {
            total: 0,
          },
        };
      }

      const count =
        1 +
        $('.ip')
          .first()
          .text()
          .split(' ')[1]
          .split('-')
          .reduce((acc, val) => val - acc);
      const total = +$('.ip')
        .first()
        .text()
        .split(' ')
        .slice(-1)[0]
        .replace(',', '');
      const perPage = 25;
      const page = $('.ptds', '.ptt').text() - 1;

      return {
        pageInfo: {
          total,
          count,
          page,
          perPage,
          hasNextPage: Math.ceil(total / perPage) - 1 > page,
          hasPrevPage: page > 0,
        },
        galleries:
          $('tr[class]', '.itg')
            .map((i, el) => ({
              id: $('.it2', el)
                .attr('id')
                .substr(1),
              token: $('a[onmouseover]', el)
                .attr('href')
                .split('/')[5],
              category: $('img', el)
                .first()
                .attr('alt'),
              title: $('.it5', el).text(),
              uploader: $('.itu', el).text(),
              url: $('a[onmouseover]', el).attr('href'),
              favorite: $('.i[id]', el).attr('title') || null,
              thumbnailUrl: ($('.it2', el)
                .children('img')
                .first()
                .attr('src') ||
                `https://exhentai.org/${$('.it2', el)
                  .text()
                  .split('~')[2]}`)
                .replace('exhentai', 'ehgt'),
              thumbnailHeight: $('.it2', el)
                .css('height')
                .split('px')[0],
              thumbnailWidth: $('.it2', el)
                .css('width')
                .split('px')[0],
              published: Date.parse(
                `${$('.itd', el)
                  .first()
                  .text()} EDT`,
              ),
              stars: backgroundPositionToStars($('.it4r', el).css('background-position')),
            }))
            .get() || [],
      };
    });

const galleryLoader = new DataLoader(
  idTokenPairs =>
    Promise.all(
      idTokenPairs.map(idTokenPair =>
        Promise.all([
          galleryFetcher(idTokenPair),
          db('gallery')
            .where({ id: idTokenPair.id })
            .first(),
        ]).then(R.mergeAll),
      ),
    ),
  {
    cacheKeyFn: JSON.stringify,
  },
);

const galleriesLoader = new DataLoader(
  queryStrings => Promise.all(queryStrings.map(galleriesFetcher)),
  { cache: false },
);

const Gallery = `
  type Gallery {
    id: Int
    token: String
    title: String
    published: Float
    category: Category
    uploader: String
    stars: Float
    rating: Float
    favorite: String
    thumbnailUrl: String
    thumbnailHeight: Int
    thumbnailWidth: Int
    url: String
    tags: [String]
    imagesPage(page: Int = 0): ImagesPage
    dismissed: Boolean
  }
  type GalleriesPage {
    pageInfo: PageInfo
    galleries: [Gallery]
  }
  extend type Query {
    getGalleries(search: String="", category: Category, categories: [Category], page: Int = 0): GalleriesPage
    getGallery(id: Int!, token: String!): Gallery
  }
  extend type Mutation {
    dismissGallery(id: Int!, token: String!): Gallery
  }
`;

export const resolvers = {
  Query: {
    getGalleries: (root, galleryFilter) =>
      galleriesLoader.load(galleryFilterToQueryString(galleryFilter)),
    getGallery: (root, { id, token }) => galleryLoader.load({ id, token }),
  },
  Mutation: {
    dismissGallery: (root, { id, token }) =>
      upsertGallery({ id, dismissed: true }).then(() =>
        galleryLoader.clear({ id, token }).load({ id, token }),
      ),
  },
  Gallery: {
    //    __typeName: (w,t,f,{ parentType })=>''+JSON.stringify(parentType),
    category: ({ category }) => category.replace('-', '').toUpperCase(),
    dismissed: ({ id, dismissed }) =>
      dismissed ||
      db('gallery')
        .where({ id })
        .first('dismissed')
        .then(row => row && row.dismissed),
    imagesPage: ({ id, token, imagesPage }, { page = 0 }) => {
      if (!page && imagesPage) {
        return imagesPage;
      }
      return galleryLoader.load({ id, token, page }).then(R.prop('imagesPage'));
    },
    tags: ({ id, token, tags }) => tags || galleryLoader.load({ id, token }).then(R.prop('tags')),
  },
};

export default () => [Gallery, PageInfo];
