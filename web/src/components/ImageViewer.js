import React from 'react';
import { graphql } from 'react-apollo';
import { Link, withRouter } from 'react-router-dom';

import query from './ImageViewer.gql';
import css from './ImageViewer.scss';

async function preloadImage(url) {
  new Image().src = url;
}

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
class ImageViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleKey = this.handleKey.bind(this);
  }
  componentDidMount() {
    window.addEventListener('keydown', this.handleKey);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKey);
  }
  handleKey({ code }) {
    const { data, galleryToken } = this.props;
    const { getImage: image } = data;
    if (!image) {
      return;
    }
    const { galleryId, nextImage, previousImage } = image;

    const galleryUrl = `/gallery/${galleryId}/${galleryToken}`;
    const nextImageSubUrl = nextImage && `/image/${nextImage.token}/${nextImage.id}`;
    const previousImageSubUrl =
      previousImage && `/image/${previousImage.token}/${previousImage.id}`;
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.props.history.push(galleryUrl + previousImageSubUrl, this.props.location.state);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.props.history.push(galleryUrl + nextImageSubUrl, this.props.location.state);
        break;
      default:
        break;
    }
  }
  render() {
    const { data, total, galleryToken } = this.props;
    const { getImage: image = {}, loading, error } = data;
    const { fileUrl, galleryId, nextImage } = image;
    nextImage && preloadImage(nextImage.fileUrl);
    const nextLink =
      nextImage && `/gallery/${galleryId}/${galleryToken}/image/${nextImage.token}/${nextImage.id}`;

    return (
      <div className={css.ImageViewer}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            lineHeight: 0,
          }}>
          {(error && error.message) ||
            (loading && !fileUrl && 'Loading') ||
            (fileUrl
              ? <Link
                to={{
                  pathname: nextLink,
                  state: this.props.location.state,
                }}
                style={{ backgroundImage: `url(${fileUrl})` }} />
              : 'No image.')}
        </div>
      </div>
    );
  }
}

export default ImageViewer;
