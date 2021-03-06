// ----------------------
// IMPORTS

/* NPM */

// React
import React from 'react';

// Routing
import { Route, Switch, withRouter } from 'react-router-dom';
import { NotFound, Redirect } from 'kit/lib/routing';

/* Local */

// GraphQL queries
import Front from 'src/pages/Front';
import Gallery from 'src/pages/Gallery';

// Styles
import '../../styles.global.css';

// ----------------------

const WhenNotFound = () => (
  <NotFound>
    <h1>Unknown route - the 404 handler was triggered!</h1>
  </NotFound>
);

export default withRouter(({ location }) => (
  <Switch location={location}>
    <Route exact path="/" component={Front} />
    <Route path="/gallery/:id/:token/image/:imageToken/:imageId" component={Gallery} />
    <Route path="/gallery/:id/:token" component={Gallery} />
    <Redirect from="/old/path" to="/new/path" />
    <Route component={WhenNotFound} />
  </Switch>
));
