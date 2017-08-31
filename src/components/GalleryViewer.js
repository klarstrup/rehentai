import React from 'react';
import { graphql } from 'react-apollo';
import { Link, withRouter } from 'react-router-dom';
import _ from 'lodash';

// import { client } from 'kit/entry/browser';

import ImageViewer from './ImageViewer';

import query from './GalleryViewer.gql';
import css from './GalleryViewer.scss';

function preloadImage(url) {
  new Image().src = url;
}

export const prefetchGalleryViewer = ({ id, token }, client) => () => {
  client
    .query({
      query,
      variables: { id, token },
    })
    .then(({ data: { getGallery: { imagesPage: { images: [{ fileUrl }] } } } }) =>
      !SERVER && preloadImage(fileUrl),
    );
};

@withRouter
@graphql(query, {
  options: ({ id, token }) => ({
    variables: {
      id: +id,
      token,
    },
  }),
})
class GalleryViewer extends React.Component {
  render() {
    const {
      data = {},
      imageId,
      imageToken,
      location: { state: { search = '' } = {} },
    } = this.props;
    if (data.loading) return <div> Loading... </div>;
    if (data.error) {
      return (
        <div>
          {data.error.message}
        </div>
      );
    }
    if (!data.getGallery) return <div> No gallery found </div>;
    const {
      getGallery: {
        id,
        token,
        title,
        tags,
        thumbnailUrl,
        imagesPage: { images: [frontPage], pageInfo: { total } },
      } = {},
    } = data;
    const tagsByNamespace = tags.reduce((accu, namespacedTag) => {
      const namespace = (namespacedTag.indexOf(':') > 0 && namespacedTag.split(':')[0]) || 'misc';
      const tag = namespacedTag.split(':')[1] || namespacedTag;
      return {
        ...accu,
        [namespace]: (accu[namespace] && [...accu[namespace], tag]) || [tag],
      };
    }, {});
    return (
      <section className={css.GalleryViewer}>
        <header>
          <Link to={`/gallery/${id}/${token}`}>
            <img src={thumbnailUrl} alt={frontPage.name} />
          </Link>
          <div className={css.info}>
            <Link className={css['gallery-link']} to={`/gallery/${id}/${token}`}>
              {title}
            </Link>
            {' | '}
            <a href={`//exhentai.org/g/${id}/${token}`}>EH</a>
            <hr />
            <div className={css.tags}>
              {_.map(tagsByNamespace, (tagsOfNamespace, namespace) =>
                (<div key={namespace}>
                  <header>
                    {namespace}
                  </header>
                  <ul>
                    {tagsOfNamespace.map(tag =>
                      (<li key={tag}>
                        <Link to={`/?search=${namespace}:${tag}`}>
                          {tag.replace(/_/g, ' ')}
                        </Link>
                      </li>),
                    )}
                  </ul>
                </div>),
              )}
            </div>
          </div>
          <Link
            className={css['front-link']}
            to={{
              pathname: '/',
              search: search && `?search=${search}`,
            }}>
            X
          </Link>
        </header>
        {imageId && imageToken
          ? <ImageViewer
            galleryId={id}
            galleryToken={token}
            token={imageToken}
            pageNumber={imageId.split('-')[1] - 1}
            pageTotal={total} />
          : <ImageViewer {...frontPage} pageTotal={total} galleryToken={token} />}
        <footer className={css['page-position']}>
          {(imageId && imageId.split('-')[1]) || frontPage.pageNumber || 1}/{total}
          {' | '}
          <a href={`//exhentai.org/s/${imageToken}/${imageId}`}>EH</a>
        </footer>
      </section>
    );
  }
}

export default GalleryViewer;
