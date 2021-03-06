import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import { graphql } from 'react-apollo';
import { Link, withRouter } from 'react-router-dom';
import R from 'ramda';

import ImageViewer from './ImageViewer';

import query from './GalleryViewer.gql';
import css from './GalleryViewer.scss';

import ehFavicon from './GalleryViewer-eh-favicon.png';

function preloadImage(url) {
  new Image().src = url;
}

export const prefetchGalleryViewer = ({ id, token }, client) => () => {
  client
    .query({
      query,
      variables: { id, token },
    })
    .then(
      ({ data: { getGallery: { imagesPage: { images: [{ fileUrl }] } } } }) =>
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
  props: props => ({
    ...props,
    data: {
      ...props.data,
      loadMoreEntries: () =>
        props.data.getGallery.imagesPage.pageInfo.hasNextPage &&
        props.data.fetchMore({
          variables: {
            page: props.data.getGallery.imagesPage.pageInfo.page + 1,
          },
          updateQuery: (previousResult, { fetchMoreResult }) => {
            const getResultPageNumber = R.view(
              R.lensPath(['getGallery', 'imagesPage', 'pageInfo', 'page']),
            );
            const resultImagesLens = R.lensPath(['getGallery', 'imagesPage', 'images']);
            const getResultImages = R.view(resultImagesLens);

            if (!fetchMoreResult || R.eqBy(getResultPageNumber)(previousResult, fetchMoreResult)) {
              return previousResult;
            }
            return R.set(
              resultImagesLens,
              R.concat(getResultImages(previousResult), getResultImages(fetchMoreResult)),
              R.clone(fetchMoreResult),
            );
          },
        }),
    },
  }),
})
class GalleryViewer extends React.Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKey);
    this.focusThumbsList();
  }
  componentDidUpdate() {
    this.focusThumbsList();
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKey);
  }
  thumbsList = null;
  focusThumbsList = () => {
    const { thumbsList, thumbsListCurrent } = this;
    if (thumbsList) {
      // If there's no current thumb it means that we need to load more until we get it
      // We can calculate and handle the loading better but this will do for now
      if (!thumbsListCurrent) {
        this.props.data.loadMoreEntries();
      } else {
        const { width: thumbsListWidth } = thumbsList.getBoundingClientRect();
        const {
          width: thumbsListCurrentWidth,
          left: thumbsListCurrentLeft,
        } = thumbsListCurrent.getBoundingClientRect();

        thumbsList.scrollLeft =
          thumbsList.scrollLeft +
          thumbsListCurrentLeft -
          thumbsListWidth / 2 +
          thumbsListCurrentWidth / 2;
      }
    }
  };
  handleKey = ({ code }) => {
    const { location: { state: { search = '' } = {} } } = this.props;
    if (code === 'Escape') {
      this.props.history.push(search ? `/?search=${search}` : '/', this.props.location.state);
    }
  };
  handleScroll = e => {
    if (e.target.scrollLeft + e.target.clientWidth >= e.target.scrollWidth) {
      this.props.data.loadMoreEntries();
    }
  };
  render() {
    const { data, imageId, imageToken, location: { state: { search = '' } = {} } } = this.props;
    if (data.error) return <div>{data.error.message}</div>;
    if (!data.loading && !data.getGallery) return <div> No gallery found </div>;
    const { id, token } = this.props;
    const {
      getGallery: {
        title,
        tags = [],
        imagesPage: { images = [], pageInfo: { total } = {} } = {},
      } = {},
      loading = false,
    } = data;
    const frontPage = images[0];
    const isPreview = !imageId || !imageToken;
    const overlayStyle = isPreview ? { opacity: 1 } : {};
    const pageNumber = imageId ? imageId.split('-')[1] - 1 : 0;
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
        <Helmet
          title={`${title} - Rehentai`}
          meta={[
            {
              name: 'description',
              content: 'Rehentai',
            },
          ]} />
        {loading ? (
          <header style={{ ...overlayStyle }}>Loading...</header>
        ) : (
          <header style={{ ...overlayStyle }}>
            <div className={css.info}>
              <Link className={css['gallery-link']} to={`/gallery/${id}/${token}`}>
                {title}
              </Link>
              {' | '}
              <a href={`//exhentai.org/g/${id}/${token}`} target="_blank">
                <img src={ehFavicon} alt={'EH Logo'} />
              </a>
              <hr />
              <div className={css.tags}>
                {R.toPairs(tagsByNamespace).map(([namespace, tagsOfNamespace]) => (
                  <div key={namespace}>
                    <header>{namespace}</header>
                    <ul>
                      {tagsOfNamespace.map(tag => (
                        <li key={tag}>
                          <Link to={`/?search=${namespace}:${tag}`}>{tag.replace(/_/g, ' ')}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <Link className={css['front-link']} to={search ? `/?search=${search}` : '/'}>
              X
            </Link>
          </header>
        )}
        {!loading ? (
          <ImageViewer
            {...(isPreview ? frontPage : { token: imageToken, pageNumber })}
            galleryId={+id}
            galleryToken={token}
            isPreview={isPreview}
            pageTotal={total}
            thumbnailUrl={images[pageNumber] && images[pageNumber].thumbnailUrl} />
        ) : null}
        {loading ? (
          <footer style={{ ...overlayStyle }}>Loading...</footer>
        ) : (
          <footer className={css['page-position']} style={{ ...overlayStyle }}>
            {(imageId && imageId.split('-')[1]) || frontPage.pageNumber || 1}/{total}
            {' | '}
            <a href={`//exhentai.org/s/${imageToken}/${imageId}`} target="_blank">
              <img src={ehFavicon} alt={'EH Logo'} />
            </a>
            <ul
              style={{ display: 'flex', overflowX: 'scroll', overflowY: 'hidden', height: '150px' }}
              onScroll={this.handleScroll}
              ref={thumbsList => {
                this.thumbsList = thumbsList;
              }}>
              {images.map(image => (
                <li
                  key={image.id}
                  ref={
                    image.pageNumber === pageNumber &&
                    (thumbsListCurrent => {
                      this.thumbsListCurrent = thumbsListCurrent;
                    })
                  }
                  style={{ height: '100%', width: 'auto' }}>
                  <Link to={`/gallery/${id}/${token}/image/${image.token}/${image.id}/${total}`}>
                    <img
                      src={image.thumbnailUrl}
                      alt={image.name}
                      style={{
                        height: '100%',
                        width: 'auto',
                        opacity: pageNumber === image.pageNumber ? 0.5 : 1,
                      }} />
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </section>
    );
  }
}

GalleryViewer.propTypes = {
  token: PropTypes.string.isRequired,
};

export default GalleryViewer;
