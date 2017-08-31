import React from 'react';
import { graphql, withApollo } from 'react-apollo';
import { Link } from 'react-router-dom';

import { prefetchGalleryViewer } from './GalleryViewer';

import css from './Galleries.scss';
import query from './Galleries.gql';

@withApollo
class GalleriesItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = { imageStatus: 'loading' };

    this.handleImageLoaded = this.handleImageLoaded.bind(this);
    this.handleImageErrored = this.handleImageErrored.bind(this);
  }

  handleImageLoaded() {
    this.setState({ imageStatus: 'loaded' });
  }

  handleImageErrored() {
    this.setState({ imageStatus: 'failed' });
  }
  render() {
    const {
      id,
      token,
      title,
      thumbnailUrl,
      thumbnailWidth,
      thumbnailHeight,
      favorite,
      search,
      client,
    } = this.props;
    const heightNormalizationRatio = css.thumbnailHeight.split('px')[0] / thumbnailHeight;
    const shortTitle = title
      .replace(/{.*?}/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/<.*?>/g, '')
      .replace(/\(.*?\)/g, '')
      .replace('-', '‑');
    const shorterTitle = shortTitle.split(' | ')[1] || shortTitle;
    return (
      <Link
        to={{
          pathname: `/gallery/${id}/${token}`,
          state: { search },
        }}
        onMouseOver={(() => {}) || prefetchGalleryViewer({ id, token }, client)}
        style={{
          width: thumbnailWidth * heightNormalizationRatio,
          opacity: +(
            SERVER ||
            this.state.imageStatus === 'loaded' ||
            this.state.imageStatus === 'failed'
          ),
          background: this.state.imageStatus === 'failed' && 'red',
        }}>
        <img
          alt={title}
          src={thumbnailUrl}
          className={favorite ? css.favorite : ''}
          onLoad={this.handleImageLoaded}
          onError={this.handleImageErrored} />
        <div className={css['gallery-title']}>{shorterTitle}</div>
      </Link>
    );
  }
}

@graphql(query, {
  options: ({ search = '', categories = [] }) => ({
    variables: {
      page: 0,
      search,
      categories,
    },
  }),
  props(props) {
    return {
      ...props,
      data: {
        ...props.data,
        loadMoreEntries: () =>
          props.data.getGalleries.pageInfo.hasNextPage &&
          props.data.fetchMore({
            variables: {
              page: props.data.getGalleries.pageInfo.page + 1,
            },
            updateQuery: (previousResult, { fetchMoreResult }) => {
              if (!fetchMoreResult) {
                return previousResult;
              }
              return {
                getGalleries: {
                  ...fetchMoreResult.getGalleries,
                  galleries: [
                    ...previousResult.getGalleries.galleries,
                    ...fetchMoreResult.getGalleries.galleries,
                  ],
                },
              };
            },
          }),
      },
    };
  },
})
class Galleries extends React.Component {
  constructor(props) {
    super(props);
    this.handleScroll = this.handleScroll.bind(this);
  }
  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }
  handleScroll() {
    const windowHeight = window.innerHeight || document.documentElement.offsetHeight;
    const { body, documentElement } = document;
    const heights = [
      body.scrollHeight,
      body.offsetHeight,
      documentElement.clientHeight,
      documentElement.scrollHeight,
      documentElement.offsetHeight,
    ];
    const docHeight = Math.max(...heights);
    const windowBottom = windowHeight + window.pageYOffset;
    if (windowBottom >= docHeight) {
      this.props.data.loadMoreEntries();
    }
  }
  render() {
    const {
      data: { loading, getGalleries: { galleries = [], pageInfo: { total } = {} } = {} },
      search,
    } = this.props;
    if (loading && !galleries) return <div> Loading... </div>;
    return (
      <div className={css.galleries}>
        <div className={css.pageInfo}>
          {total} results
          <hr />
        </div>
        {galleries.map(gallery => <GalleriesItem key={gallery.id} {...gallery} search={search} />)}
      </div>
    );
  }
}

export default Galleries;
