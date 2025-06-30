const normalizeUrl = require('../lib/os.js');
const piramiteConfig = require('../piramite.config');

function getStyles () {
	let styles = '';

  for(var i = 0; i < piramiteConfig.styles.length; i++) {
    const style = normalizeUrl(piramiteConfig.styles[i]);
    
    styles += `require('${style}');`;
  }

  return styles;
}

module.exports = getStyles;