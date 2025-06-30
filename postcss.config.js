const autoprefixer = require('autoprefixer');
const postCssFilters = require('pleeease-filters');
const postCssPixrem = require('pixrem');
const postCssInlineSvg = require('postcss-inline-svg');

const piramiteConfig = require('./piramite.config');

module.exports = {
  plugins() {
    return [
      postCssInlineSvg({path: piramiteConfig.svgFolder}),
      postCssPixrem(),
      postCssFilters(),
      autoprefixer
    ];
  }
};
