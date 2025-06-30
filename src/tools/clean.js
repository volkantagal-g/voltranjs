/* istanbul ignore file */
const { cleanDir } = require('./lib/fs');
const piramiteConfig = require('../../piramite.config');

function clean() {
  return Promise.all([cleanDir(`${piramiteConfig.distFolder}/*`, { nosort: true, dot: true })]);
}

module.exports = clean;
