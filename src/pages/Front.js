import React from 'react';
import Helmet from 'react-helmet';
import { withRouter } from 'react-router-dom';
import URLSearchParams from 'url-search-params';
import _ from 'lodash';

import Galleries from '../components/Galleries';

@withRouter
class Front extends React.PureComponent {
  constructor(props) {
    super(props);
    const search = new URLSearchParams(props.location.search).get('search') || '';
    this.state = { search };

    this.handleChange = this.handleChange.bind(this);
    this.updateUrl = _.debounce(this.updateUrl, 500, { leading: true });
  }
  componentWillReceiveProps(newProps) {
    this.setState(state => ({
      ...state,
      search: new URLSearchParams(newProps.location.search).get('search') || '',
    }));
  }
  handleChange = event => {
    const search = event.target.value;
    this.setState({ search });
    this.updateUrl(search.trim());
  };
  updateUrl(search) {
    const urlSearch = new URLSearchParams(this.props.location.search).get('search');
    if (search !== urlSearch) {
      if (search) {
        this.props.history.push(`/?search=${search}`);
      } else {
        this.props.history.push('/');
      }
    }
  }
  render() {
    const search = new URLSearchParams(this.props.location.search).get('search');
    return (
      <section>
        <Helmet
          title={`${(search && `${search} - `) || ''}Rehentai`}
          meta={[
            {
              name: 'description',
              content: 'Rehentai',
            },
          ]} />
        <input type="text" value={this.state.search} onChange={this.handleChange} />
        <Galleries search={search} categories={['DOUJINSHI', 'MANGA', 'WESTERN']} />
      </section>
    );
  }
}

export default Front;
