import React from 'react';

import GalleryViewer from '../components/GalleryViewer';

export default ({ match: { params } }) => <GalleryViewer {...params} style={{ position: 'absolute', left: 0, right: 0, top: 0 }} />;
