import { DOMContentLoaded } from './lib/spa/utils/dom-content-loaded';

// IBM Plex Sans Condensed, bundled; the headings use these two weights
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-sans-condensed/700.css';

import './styles/main.css';
import './styles/views.css';

// Events that happens after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DOMContentLoaded);
} else {
  // `DOMContentLoaded` already fired
  DOMContentLoaded();
}
