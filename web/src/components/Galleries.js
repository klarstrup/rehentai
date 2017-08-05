import React from 'react';
import { graphql, withApollo } from 'react-apollo';
import { Link } from 'react-router-dom';

import { prefetchGalleryViewer } from './GalleryViewer';

import css from './Galleries.scss';
import query from './Galleries.gql';

// The data prop, which is provided by the wrapper below contains,
// a `loading` key while the query is in flight and posts when it is ready
@withApollo
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
      data: { loading, getGalleries: { galleries, pageInfo: { total } = {} } = {} },
      client,
      search,
    } = this.props;
    if (loading && !galleries) return <div> Loading... </div>;
    return (
      <div className={css.galleries}>
        <div style={{ width: '100%' }}>
          {total} resultses
          <hr />
        </div>
        {galleries.map(
          ({ id, token, title, thumbnailUrl, thumbnailWidth, thumbnailHeight, stars } = {}) => {
            const heightNormalizationRatio = css.thumbnailHeight.split('px')[0] / thumbnailHeight;
            return (
              <Link
                to={{
                  pathname: `/gallery/${id}/${token}`,
                  state: { search },
                }}
                key={id}
                onMouseOver={(() => {}) || prefetchGalleryViewer({ id, token }, client)}
                style={{
                  width: thumbnailWidth * heightNormalizationRatio,
                }}>
                <img
                  alt={title}
                  src={thumbnailUrl}
                  style={{
                    boxShadow: `0 0 ${stars * 5}px 0 rgba(0,0,0,${stars / 5})`,
                  }} />
              </Link>
            );
          },
        )}
      </div>
    );
  }
}

export default Galleries;
