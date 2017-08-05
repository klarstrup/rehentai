// Welcome to Launchpad!
// Log in to edit and save pads, run queries in GraphiQL on the right.
// Click "Download" above to get a zip with a standalone Node.js server.
// See docs and examples at https://github.com/apollographql/awesome-launchpad

// graphql-tools combines a schema string with resolvers.
import { makeExecutableSchema } from "graphql-tools";

import nodeFetch from "node-fetch";
import cheerio from "cheerio";

import qs from "qs";
import _ from "lodash";
import DataLoader from "dataloader";
import process from "process";

require("dotenv").config({ path: `${__dirname}/../../.env` });

const globalCookies = {
  nw: 1,
  uconfig: "lt_p-to_p-pn_1",
  s: "582183e83"
};

const objectToCookieString = object =>
  _.map(object, (value, key) => `${key}=${value}`).join("; ");

const fetch = (url, options = {}) =>
  console.log(objectToCookieString(globalCookies)) ||
  nodeFetch(url, {
    credentials: "include",
    ...options,
    headers: {
      cookie: objectToCookieString(globalCookies),
      ...options.headers
    }
  }).then(res => console.log(`GET ${url} ${res.status}`) || res);

const logOnToEH = async (UserName, PassWord) => {
  const loginResponse = await fetch(
    `https://forums.e-hentai.org/index.php?act=Login&CODE=01&CookieDate=1`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: qs.stringify({
        UserName,
        PassWord,
        referer: "act=Login&CODE=01&CookieDate=1"
      })
    }
  );
  // Get cookies for later.
  loginResponse.headers.getAll("Set-Cookie").forEach(setCookie => {
    const [key, value] = setCookie.split("; ")[0].split("=", 2);
    globalCookies[key] = value;
  });

  const html = await loginResponse.text();

  if (html.indexOf("<p>You are now logged in as:") === -1) {
    throw new Error("Failed to sign into EH");
  }
  return loginResponse;
};

const { EXHENTAI_USERNAME, EXHENTAI_PASSWORD } = process.env;
logOnToEH(EXHENTAI_USERNAME, EXHENTAI_PASSWORD).then(res =>
  console.log("Signed into EH")
);

    res.text().then(html => {
      const $ = cheerio.load(html);

      if (
        html.indexOf(
          "<p>This gallery has been removed or is unavailable.</p>"
        ) > 0
      ) {
        throw new Error("E-Hentai: This gallery has been removed or is unavailable.");
      }

      const total = +$(".gpc").text().split(" ").slice(-2)[0];
      const perPage = 40;
      const page = +$(".ptds", ".ptt").text() - 1;

      return {
        id,
        token,
        title: $("#gn").text(),
        url: `http://e-hentai.org/g/${id}/${token}/`,
        thumbnailUrl: /.*((?:http|https)(?::\/{2}[\w]+)(?:[\/|\.]?)(?:[^\s)"]*))/g.exec(
          $("div", "#gd1").css("background")
        )[1].replace('exhentai','ehgt'),
        rating: $("#rating_label").text().substr(-4),
        uploader: $("a", "#gdn").first().text(),
        category: $("a", "#gdc").first().attr("href").split("/").slice(-1)[0],
        published: Date(`{$('.gdt2').first().text()} EDT`),
        tags: $("a", "#taglist").map((i, el) => $(el).attr("id").substr(3)),
        imagesPage: {
          pageInfo: {
            total,
            page,
            perPage,
            hasNextPage: Math.ceil(total / perPage) - 1 > page,
            hasPrevPage: page > 0
          },
          images: $("a", "#gdt").map((i, el) => ({
            ...idTokenPageNumberFromImageUrl($(el).attr("href")),
            url: $(el).attr("href"),
            name: $("img", el).attr("title").split(" ", 3)[2]
          }))
        }
      };
    })
  );

const idTokenPageNumberFromImageUrl = url => ({
  id: url.split("/").slice(-1)[0],
  galleryId: +url.split("/").slice(-1)[0].split("-")[0],
  token: url.split("/").slice(-2)[0],
  pageNumber: url.split("/").slice(-1)[0].split("-")[1] - 1
});
const imageFetcher = ({ galleryId, token, pageNumber = 0 }) =>
  fetch(`http://e-hentai.org/s/${token}/${galleryId}-${1 + pageNumber}`, {
    headers: {
      cookie: "nw=1; uconfig=uh_n" // This is needed to avoid the "Offensive For Everyone" screen.
    }
  }).then(res =>
    res.text().then(html => {
      const $ = cheerio.load(html);

      const [name, resolution, size] = $("div", "#i2")
        .last()
        .text()
        .split(" :: ");
      const [fileWidth, fileHeight] = resolution.split(" x ").map(d => +d);

      if ($("#img").attr("src").substr(-7) === "509.gif") {
        throw new Error("E-Hentai: 509 Bandwidth Exceeded");
      }

      return {
        ...idTokenPageNumberFromImageUrl(res.url),
        fileUrl: $("#img").attr("src"),
        name,
        fileWidth,
        fileHeight,
        fileSize: +size.split(" ")[0],
        nextImage: idTokenPageNumberFromImageUrl(
          $("#next").first().attr("href")
        ),
        previousImage: idTokenPageNumberFromImageUrl(
          $("#prev").first().attr("href")
        ),
        firstImage: idTokenPageNumberFromImageUrl(
          $("a", "#i2").first().attr("href")
        ),
        lastImage: idTokenPageNumberFromImageUrl(
          $("a", "#i2").last().attr("href")
        )
      };
    })
  );

const galleryFilterToQueryString = ({
  search = "",
  page = 0,
  category,
  categories = [category]
}) =>
  qs.stringify({
    page,
    f_search: search,
    f_doujinshi: +categories.includes("DOUJINSHI"),
    f_manga: +categories.includes("MANGA"),
    f_artistcg: +categories.includes("ARTISTCG"),
    f_gamecg: +categories.includes("GAMECG"),
    f_western: +categories.includes("WESTERN"),
    "f_non-h": +categories.includes("NONH"),
    f_imageset: +categories.includes("IMAGESET"),
    f_cosplay: +categories.includes("COSPLAY"),
    f_asianporn: +categories.includes("ASIANPORN"),
    f_misc: +categories.includes("MISC")
  });

const galleriesFetcher = galleryFilterQueryString =>
  fetch(`http://e-hentai.org/?${galleryFilterQueryString}`)
    .then(res => res.text())
    .then(html => {
      const $ = cheerio.load(html);

      if (
        html.indexOf(
          '<p style="text-align:center; font-style:italic; margin-bottom:10px">No hits found</p>'
        ) > 0
      ) {
        return {
          galleries: [],
          pageInfo: {
            total: 0
          }
        };
      }

      const count =
        1 +
        $(".ip")
          .first()
          .text()
          .split(" ")[1]
          .split("-")
          .reduce((acc, val) => val - acc);
      const total = +$(".ip")
        .first()
        .text()
        .split(" ")
        .slice(-1)[0]
        .replace(",", "");
      const perPage = 25;
      const page = $(".ptds", ".ptt").text() - 1;

      return {
        pageInfo: {
          total,
          count,
          page,
          perPage,
          hasNextPage: Math.ceil(total / perPage) - 1 > page,
          hasPrevPage: page > 0
        },
        galleries:
          $("tr[class]", ".itg")
            .map((i, el) => ({
              id: $(".it2", el).attr("id").substr(1),
              token: $("a[onmouseover]", el).attr("href").split("/")[5],
              category: $("img", el).first().attr("alt"),
              title: $(".it5", el).text(),
              uploader: $(".itu", el).text(),
              url: $("a[onmouseover]", el).attr("href"),
              thumbnailUrl:
                ($(".it2", el).children("img").first().attr("src") ||
                "https://exhentai.org/" + $(".it2", el).text().split("~")[2]).replace('exhentai','ehgt'),
              thumbnailHeight: $(".it2", el).css("height").split("px")[0],
              thumbnailWidth: $(".it2", el).css("width").split("px")[0],
              published: Date(`{$('.itd', el).first().text()} EDT`),
              stars: backgroundPositionToStars(
                $(".it4r", el).css("background-position")
              )
            }))
            .get() || []
      };
    });
/*
const galleryLoader = new DataLoader(
  idTokenPairs => Promise.all(idTokenPairs.map(galleryFetcher)),
  {
    cacheKeyFn: JSON.stringify
  }
);
*/

const galleryLoader = new DataLoader(
  idTokenPairs => Promise.all(idTokenPairs.map(galleryFetcher)),
  {
    cacheKeyFn: JSON.stringify
  }
);
fetch("https://api.e-hentai.org/api.php", {
  method: "POST",
  body: JSON.stringify({
    method: "gdata",
    gidlist: [
      [1084084, "95562c906c"],
      [1053744, "d6853443ca"],
      [1084084, "95562c906c"]
    ]
  })
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);

const galleriesLoader = new DataLoader(queryStrings =>
  Promise.all(queryStrings.map(galleriesFetcher))
);
const imageLoader = new DataLoader(
  idTokenPairs => Promise.all(idTokenPairs.map(imageFetcher)),
  {
    cacheKeyFn: ({ galleryId, token, pageNumber }) =>
      JSON.stringify({ galleryId, token, pageNumber })
  }
);

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
    getGalleries(search: String, category: Category, categories: [Category], page: Int): GalleriesPage
    getGallery(id: Int!, token: String!): Gallery
    getImage(galleryId: Int!, token: String!, pageNumber: Int!): Image
  }
  type Gallery {
		id: Int
    token: String
    title: String
		published: String
		category: Category
		uploader: String
		stars: Float
		rating: Float
    thumbnailUrl: String
    thumbnailHeight: Int
    thumbnailWidth: Int
		url: String
		tags: [String]
		imagesPage(page: Int = 0): ImagesPage
  }
  type PageInfo {
    total: Int
    count: Int
    page: Int
    perPage: Int
    hasNextPage: Boolean
    hasPrevPage: Boolean
  }
  type ImagesPage {
    pageInfo: PageInfo
    images(limit: Int, start: Int): [Image]
  }
  type GalleriesPage {
    pageInfo: PageInfo
    galleries: [Gallery]
  }
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
    nextImage: Image
    previousImage: Image
    firstImage: Image
    lastImage: Image
	}
`;

const backgroundPositionToStars = backgroundPosition => {
  let stars = 5;

  const regexp = /([+-]?\d+)(.*?)([+-]?\d+)/i;
  const m = regexp.exec(backgroundPosition);
  if (m != null) {
    var horizontal = -parseInt(m[1], 10);
    var vertical = -parseInt(m[3], 10);
  }

  if (vertical === 21) {
    stars -= 0.5;
  }

  stars -= horizontal / 16;

  return stars;
};

const someFunction = key => obj => {
  if (obj[key]) {
    return imageLoader.load(obj[key]);
  }
  const { galleryId, token, pageNumber } = obj;
  return imageLoader
    .load({ galleryId, token, pageNumber })
    .then(image => imageLoader.load(image[key]));
};

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    getGalleries: (root, galleryFilter) =>
      galleriesLoader.load(galleryFilterToQueryString(galleryFilter)),
    getGallery: (root, { id, token }) =>
      galleryLoader.load({ id, token, page: 0 }),
    getImage: (root, { galleryId, token, pageNumber }) =>
      imageLoader.load({ galleryId, token, pageNumber })
  },
  Gallery: {
    //    __typeName: (w,t,f,{ parentType })=>''+JSON.stringify(parentType),
    category: ({ category }) => category.replace("-", "").toUpperCase(),
    imagesPage: ({ id, token, imagesPage }, { page = 0 }) => {
      if (!page && imagesPage) {
        return imagesPage;
      }
      return galleryLoader
        .load({ id, token, page })
        .then(_.property("imagesPage"));
    },
    tags: ({ id, token, tags }) =>
      tags || galleryLoader.load({ id, token }).then(_.property("tags"))
  },
  ImagesPage: {
    images: ({ images }, { limit, start = 0 }) => images.slice(start, limit)
  },
  Image: {
    fileUrl: ({ galleryId, token, pageNumber, fileUrl }) =>
      fileUrl ||
      imageLoader
        .load({ galleryId, token, pageNumber })
        .then(_.property("fileUrl")),
    nextImage: someFunction("nextImage"),
    lastImage: someFunction("lastImage"),
    firstImage: someFunction("firstImage"),
    previousImage: someFunction("previousImage")
  }
};
console.log("dookie");

// Required: Export the GraphQL.js schema object as "schema"
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers
  //  logger: console
});

// Optional: Export a function to get context from the request. It accepts two
// parameters - headers (lowercased http headers) and secrets (secrets defined
// in secrets section). It must return an object (or a promise resolving to it).
export function context(headers, secrets) {
  return {
    headers,
    secrets
  };
}

// Optional: Export a root value to be passed during execution
// export const rootValue = {};
