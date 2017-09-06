import React from 'react';

import GalleryViewer from '../components/GalleryViewer';

export default ({ match: { params } }) => <GalleryViewer {...params} />;
