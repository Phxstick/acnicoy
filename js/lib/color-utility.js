
// Functions for converting decimal value to hex or the other way round
function d2h(d) { return d.toString(16); }
function h2d(h) { return parseInt(h, 16); }

/**
 * Mixes given two colors, applying given weight to the first color.
 * Equivalent to the function used by SASS.
 * Copied almost verbatim from https://gist.github.com/jedfoster/7939513
 * @param {String} color1 - Given as hex color.
 * @param {String} color2 - Given as hex color.
 * @param {Float} weight - Between 0 and 100.
*/
function mix(color_1, color_2, weight) {
  let startsWithSharp = color_1.startsWith("#") || color_2.startsWith("#");
  if (color_1.startsWith("#")) color_1 = color_1.slice(1);
  if (color_2.startsWith("#")) color_2 = color_2.slice(1);
  let color = "";

  // Set the weight to 50%, if that argument is omitted
  weight = (typeof(weight) !== 'undefined') ? weight : 50;

  for(let i = 0; i <= 5; i += 2) { // loop through each of the 3 hex pairs
      // Extract the hex pairs of the given colors
      const v1 = h2d(color_1.substr(i, 2));
      const v2 = h2d(color_2.substr(i, 2));
          
      // Combine current pairs from each source color according to weight
      let val = d2h(Math.round(v2 + (v1 - v2) * (weight / 100.0))); 
  
      // prepend a '0' if val results in a single digit
      while (val.length < 2) { val = '0' + val; }
      
      color += val;
  }

  if (startsWithSharp) color = "#" + color;
  return color;
};

/**
 * Calculates darkness ratio of given color as the Euclidian distance of it
 * to white divided by the distance between white and black;
 * @param {String} color - Given as hex color.
 * @returns {Float} Ratio between 0 and 1.
*/
function getDarknessRatio(color) {
  let sum = 0;

  for(let i = 0; i <= 5; i += 2) {
      const value = h2d(color.substr(i, 2));
      sum += Math.pow(255 - value, 2);
  }

  return Math.sqrt(sum) / 441.673;
}

/**
 * Check whether the given color can be deemed as a dark one.
 * @param {String} color - Given as hex color.
 * @returns {Boolean}
*/
function isDark(color) {
  return getDarknessRatio(color) > 0.5;
}

/**
 * Return given hex color in the form 'rgba(..., alphaValue)'.
 * @param {String} color - Given as hex color.
 * @returns {String}
*/
function applyAlpha(color, alphaValue) {
  if (color.startsWith("#")) color = color.slice(1);
  const rgbArray = [];
  for(let i = 0; i <= 5; i += 2) {
      rgbArray.push(h2d(color.substr(i, 2)));
  }
  return `rgba(${rgbArray.join(", ")}, ${alphaValue})`;
}

/**
 * Check whether given string is a valid hex color.
 * @param {String} input
 * @returns {Boolean}
*/
function isHex(input) {
    if (!input.startsWith("#")) return false;
    if (input.length !== 4 && input.length !== 7) return false;
    for (let i = 1; i < input.length; ++i) {
        const char = input[i].toLowerCase();
        if (!(char >= "0" && char <= "9") && !(char >= "a" && char <= "f"))
            return false;
    }
    return true;
}

module.exports.mix = mix;
module.exports.getDarknessRatio = getDarknessRatio;
module.exports.isDark = isDark;
module.exports.applyAlpha = applyAlpha;
module.exports.isHex = isHex;
