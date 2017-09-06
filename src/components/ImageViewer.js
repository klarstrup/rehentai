import React from 'react';
import { graphql } from 'react-apollo';
import { Link, withRouter } from 'react-router-dom';

import query from './ImageViewer.gql';
import refreshMutation from './ImageViewerRefresh.gql';
import css from './ImageViewer.scss';

@withRouter
@graphql(query, {
  options: ({ galleryId, token, pageNumber }) => ({
    variables: {
      galleryId,
      token,
      pageNumber,
    },
  }),
})
@graphql(refreshMutation, {
  props: ({ mutate }) => ({
    refreshImage: ({ galleryId, token, pageNumber }) =>
      mutate({ variables: { galleryId, token, pageNumber } }),
  }),
})
class ImageViewer extends React.Component {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKey);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKey);
  }
  handleKey = ({ code }) => {
    const { data, galleryToken, pageTotal, isPreview, pageNumber } = this.props;
    const { getImage: image } = data;
    if (!image) {
      return;
    }
    const { galleryId, nextImage, previousImage } = image;
    const galleryUrl = `/gallery/${galleryId}/${galleryToken}`;
    const currentImageUrl = image && `/image/${image.token}/${image.id}/${pageTotal}`;
    const nextImageUrl = nextImage && `/image/${nextImage.token}/${nextImage.id}/${pageTotal}`;
    const previousImageUrl =
      previousImage && `/image/${previousImage.token}/${previousImage.id}/${pageTotal}`;
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        if (pageNumber === 0) {
          this.props.history.push(galleryUrl, this.props.location.state);
        } else {
          this.props.history.push(galleryUrl + previousImageUrl, this.props.location.state);
        }
        break;
      case 'ArrowRight':
      case 'Space':
      case 'KeyD':
        if (isPreview) {
          this.props.history.push(galleryUrl + currentImageUrl, this.props.location.state);
        } else {
          this.props.history.push(galleryUrl + nextImageUrl, this.props.location.state);
        }
        break;
      default:
        break;
    }
  };
  preloadImage = url => {
    const image = new Image();
    image.src = url;
    image.onload = e => console.log(`loaded ${url}`, JSON.stringify(e));
    image.onerror = e => {
      console.log(`failed ${url}`, JSON.stringify(e));
      this.props.refreshImage(this.props.data.getImage);
    };
  };
  render() {
    const { data, galleryToken, pageTotal, isPreview } = this.props;
    const { getImage: image = {}, loading, error } = data;
    const { fileUrl, galleryId, nextImage } = image;
    if (!SERVER && fileUrl) {
      this.preloadImage(fileUrl);
    }
    if (nextImage && !SERVER) {
      this.preloadImage(nextImage.fileUrl);
    }
    const currentLink = image && `/gallery/${galleryId}/${galleryToken}/image/${image.token}/${image.id}/${pageTotal}`;
    const nextLink =
      nextImage &&
      `/gallery/${galleryId}/${galleryToken}/image/${nextImage.token}/${nextImage.id}/${pageTotal}`;

    return (
      <div className={css.ImageViewer}>
        <Link
          to={{
            pathname: isPreview ? currentLink : nextLink,
            state: this.props.location.state,
          }}
          style={{
            backgroundImage: `url(${fileUrl})`,
          }}>
          {(error && error.message) ||
            (loading && !fileUrl && 'Loading') ||
            (!!fileUrl || 'No image.')}
        </Link>
      </div>
    );
  }
}

export default ImageViewer;
