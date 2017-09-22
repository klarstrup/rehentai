import React from 'react';
import { graphql, withApollo } from 'react-apollo';
import { Link } from 'react-router-dom';
import R from 'ramda';
import { prefetchGalleryViewer } from './GalleryViewer';

import css from './Galleries.scss';
import query from './Galleries.gql';

@withApollo
class GalleriesItem extends React.Component {
  state = { imageStatus: 'loading' };
  handleImageLoaded = () => this.setState({ imageStatus: 'loaded' });
  handleImageErrored = () => this.setState({ imageStatus: 'failed' });
  render() {
    const {
      id,
      token,
      title,
      thumbnailUrl,
      thumbnailWidth,
      thumbnailHeight,
      favorite,
      dismissed,
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

    const stateStyle = {
      opacity: +(
        SERVER ||
        this.state.imageStatus === 'loaded' ||
        this.state.imageStatus === 'failed'
      ),
      background: this.state.imageStatus === 'failed' && 'red',
    };
    return (
      <Link
        to={{
          pathname: `/gallery/${id}/${token}`,
          state: { search },
        }}
        onMouseOver={(() => {}) || prefetchGalleryViewer({ id, token }, client)}
        style={{
          width: thumbnailWidth * heightNormalizationRatio,
          display: dismissed && 'none',
        }}>
        <img
          alt={title}
          src={thumbnailUrl}
          style={stateStyle}
          className={favorite ? css.favorite : ''}
          onLoad={this.handleImageLoaded}
          onError={this.handleImageErrored} />
        <div className={css['gallery-title']} style={stateStyle}>
          {shorterTitle}
        </div>
      </Link>
    );
  }
}

@graphql(query, {
  options: ({ search = '', categories = [] }) => ({
    variables: {
      page: 0,
      search: (search && search.trim()) || '',
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
  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }
  handleScroll = () => {
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

    if (Math.ceil(windowBottom) >= Math.floor(docHeight)) {
      this.props.data.loadMoreEntries();
    }
  };
  render() {
    const {
      data: { loading, getGalleries: { galleries = [], pageInfo: { total } = {} } = {} },
      search,
    } = this.props;
    if (loading && !galleries) return <div> Loading... </div>;
    const dismissedCount = galleries.filter(R.prop('dismissed')).length;
    return [
      <div className={`${css.pageInfo} ${loading ? css.loading : css.loaded}`} key={0}>
        {total && <span>
          <span className={loading ? css.loading : css.loaded}>{total}</span> results,
          <span className={loading ? css.loading : css.loaded}>{galleries.length - dismissedCount}</span> shown{dismissedCount ? `, ${dismissedCount} dismissed` : ''}
        </span>}
      </div>,
      <hr key={1} />,
      <div className={`${css.galleries} ${loading ? css.loading : css.loaded}`} key={2}>
        {galleries.map(gallery => <GalleriesItem key={gallery.id} {...gallery} search={search} />)}
      </div>,
    ];
  }
}

export default Galleries;
