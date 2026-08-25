// This file is a shim to make react-native-svg work on web.
// It must be imported before any component that uses react-native-svg.
// Do not modify this file.

import 'react-native-svg-web'

// Ensure the module is loaded
if (typeof window !== 'undefined') {
  // @ts-expect-error - global namespace extension
  window.ReactNativeSVG = require('react-native-svg-web')
}

export {}
