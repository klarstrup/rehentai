import React from 'react';
import { withRouter } from 'react-router-dom';
import URLSearchParams from 'url-search-params';

import Galleries from '../components/Galleries';


@withRouter
class Front extends React.PureComponent {
  constructor(props) {
    super(props);
    const search = new URLSearchParams(props.location.search).get('search');
    this.state = { search };

    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event) {
    const search = event.target.value;
    this.setState({ search });
    if (search) {
      this.props.history.push(`/?search=${search.trim()}`);
    } else {
      this.props.history.push('/');
    }
  }
  render() {
    const search = new URLSearchParams(this.props.location.search).get('search');
    return (
      <div>
        <input type="text" value={this.state.search} onChange={this.handleChange} />
        <Galleries search={search} />
      </div>
    );
  }
}

export default Front;
