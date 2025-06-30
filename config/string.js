const path = require('path');

const normalizeUrl = require('../lib/os.js');
const getStyles = require('./styles.js');

const piramiteConfig = require('../piramite.config');

const prometheusFile = piramiteConfig.monitoring.prometheus;

function replaceString() {
  const data = [
    {
      search: '__V_COMPONENTS__',
      replace: normalizeUrl(piramiteConfig.routing.components),
      flags: 'g'
    },
    {
      search: '__APP_CONFIG__',
      replace: normalizeUrl(`${piramiteConfig.appConfigFile.output.path}/${piramiteConfig.appConfigFile.output.name}.js`),
      flags: 'g'
    },
    {
      search: '__ASSETS_FILE_PATH__',
      replace: normalizeUrl(`${piramiteConfig.inputFolder}/assets.json`),
      flags: 'g'
    },
    {
      search: '__V_DICTIONARY__',
      replace: normalizeUrl(piramiteConfig.routing.dictionary),
      flags: 'g'
    },
    {
      search: '@piramite/core',
      replace: normalizeUrl(path.resolve(__dirname, '../src/index')),
      flags: 'g'
    },
    {
      search: '"__V_styles__"',
      replace: getStyles()
    }
  ];

  data.push({
    search: '__V_PROMETHEUS__',
    replace: normalizeUrl(prometheusFile || '../lib/tools/prom.js'),
    flags: 'g'
  });

  return data;
}

module.exports = replaceString;
