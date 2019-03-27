import fetchRetry from 'fetch-retry';
import spjaeld from 'spjaeld';
import R from 'ramda';

const uconfigFromObject = R.compose(
  R.join('-'),
  R.map(R.join('_')),
  R.toPairs,
);

export const globalCookies = {
  nw: 1,
  uconfig: uconfigFromObject({
    lt: 'p', // Thumbnail Settings: On page load
    pn: '1', // Show gallery page numbers: Yes
    ts: 'l', // Large gallery thumbnails
  }),
  lv: '1549333029-1550366718',
  s: '582183e83',
  sk: 'k7cpr91rgf6cmsuudhy418zvj7oa',
};

const cookieStringFromObject = R.compose(
  R.join('; '),
  R.map(R.join('=')),
  R.toPairs,
);

export const fetch = spjaeld(async (url, options = {}) => {
  const start = new Date();
  const result = await fetchRetry(url, {
    credentials: 'include',
    ...options,
    headers: {
      cookie: cookieStringFromObject(globalCookies),
      ...options.headers,
    },
  });
  const end = new Date() - start;
  console.log(`GET ${url} ${result.status}, %dms`, end);

  return result;
}, 200);

export const categoryEnumQueryFieldMap = {
  DOUJINSHI: 'f_doujinshi',
  MANGA: 'f_manga',
  ARTISTCG: 'f_artistcg',
  GAMECG: 'f_gamecg',
  WESTERN: 'f_western',
  NONH: 'f_non-h',
  IMAGESET: 'f_imageset',
  COSPLAY: 'f_cosplay',
  ASIANPORN: 'f_asianporn',
  MISC: 'f_misc',
};

export const idTokenPageNumberFromImageUrl = url => ({
  id: url.split('/').slice(-1)[0],
  galleryId: +url
    .split('/')
    .slice(-1)[0]
    .split('-')[0],
  token: url.split('/').slice(-2)[0],
  pageNumber:
    url
      .split('/')
      .slice(-1)[0]
      .split('-')[1] - 1,
});
