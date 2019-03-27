import DataLoader from 'dataloader';
import cheerio from 'cheerio';
import R from 'ramda';
import qs from 'qs';

import {
  fetch,
  idTokenPageNumberFromImageUrl,
  categoryEnumQueryFieldMap,
} from '../utils';

import db, { upsert } from '../db';

import PageInfo from './PageInfo';

const upsertGallery = object => upsert({ table: 'gallery', key: 'id', object });

const galleryFilterCategoriesToQueryObject = R.reduce(
  (acc, cat) => ({ ...acc, [categoryEnumQueryFieldMap[cat]]: 1 }),
  {},
);

const galleryFilterToQueryString = ({
  search = '',
  page = 0,
  category,
  categories = [category],
}) =>
  qs.stringify({
    page,
    f_search:
      (search &&
        R.sortBy(R.identity)(
          search.match(
            /(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g,
          ),
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

      if (
        html.indexOf(
          '<p>This gallery has been removed or is unavailable.</p>',
        ) > 0
      ) {
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
        category: $('.cta', '#gdc')
          .first()
          .text(),
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
              .first()
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

function load_pane_image(b) {
  if (b !== undefined) {
    const a = b.innerHTML.split('~', 4);
    if (a.length == 4) {
      if (a[0] == 'init') {
        b.innerHTML =
          '<img src="http://' +
          a[1] +
          '/' +
          a[2] +
          '" alt="' +
          a[3] +
          '" style="margin:0" />';
      } else {
        if (a[0] == 'inits') {
          b.innerHTML =
            '<img src="https://' +
            a[1] +
            '/' +
            a[2] +
            '" alt="' +
            a[3] +
            '" style="margin:0" />';
        }
      }
    }
  }
}

const galleriesFetcher = galleryFilterQueryString =>
  fetch(`http://exhentai.org/?${galleryFilterQueryString}`)
    .then(res => res.text())
    //    .then(res => console.log(res) || res)
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

      const count = $('.itg')
        .first()
        .find('tr')
        .slice(1).length;
      const total = +$('.ip')
        .first()
        .text()
        .split(' ')
        .slice(-2)[0]
        .replace(',', '');
      const perPage = 25;
      const page =
        $('.ptds', '.ptt')
          .find('a')
          .text() - 1;

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
          $('.itg')
            .first()
            .find('tr')
            .slice(1)
            .map((i, el) => ({
              id: $('.glname', el)
                .find('a')
                .attr('href')
                .split('/')
                .slice(-3)[0],
              token: $('.glname', el)
                .find('a')
                .attr('href')
                .split('/')
                .slice(-2)[0],
              category: $('.cta', el)
                .first()
                .text(),
              title: $('.glname', el)
                .find('a')
                .text(),
              uploader: $('a', el)
                .last()
                .text(),
              url: $('.glname', el)
                .find('a')
                .attr('href'),
              favorite:
                $('[title="Favorites 0"]', el)
                  .first()
                  .attr('title') || null,
              thumbnailUrl: $('.glthumb', el)
                .find('img')
                .attr('src')
                .replace('exhentai', 'ehgt'),
              thumbnailHeight: $('.glthumb', el)
                .css('height')
                .split('px')[0],
              thumbnailWidth: $('.glthumb', el)
                .css('width')
                .split('px')[0],
              published: new Date(
                `${$('.itd', el)
                  .first()
                  .text()} EDT`,
              ),
              stars: backgroundPositionToStars(
                $('.ir', el).css('background-position'),
              ),
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
    category: ({ category }) =>
      (category || '')
        .replace('-', '')
        .toUpperCase()
        .trim() || null,
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
    tags: ({ id, token, tags }) =>
      tags || galleryLoader.load({ id, token }).then(R.prop('tags')),
  },
};

export default () => [Gallery, PageInfo];
