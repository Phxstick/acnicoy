
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
  const startsWithSharp = color_1.startsWith("#") || color_2.startsWith("#");
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
  if (color.startsWith("#")) color = color.slice(1);
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

/**
 * Assemble colors of the given item type according to the given color scheme.
 * Take the background color from the scheme, then take various foreground
 * or shadow colors from the scheme if they have been specified, otherwise
 * generate them based on the background color in a way that keeps contrast
 * high enough to be easily readible while still being pleasant on the eyes.
 */
function assembleColors(colorScheme, type) {
    const colors = {};

    // Get background color from scheme (can be multi-color or unicolor)
    if ("background-colors" in colorScheme) {
        colors["background-color"] = colorScheme["background-colors"][type];
    } else {
        colors["background-color"] = colorScheme["background-color"];
    }
    const darknessRatio = colorLib.getDarknessRatio(colors["background-color"]);
    const isDarkBackground = colorLib.isDark(colors["background-color"]);

    // Main color (used for test item and question)
    if ("colors" in colorScheme && colorScheme["colors"][type].length > 0) {
        colors["color"] = colorScheme["colors"][type];
    } else if ("color" in colorScheme && colorScheme["color"].length > 0) {
        colors["color"] = colorScheme["color"];
    } else {
        colors["color"] = isDarkBackground ?
            colorLib.mix("808080", "ffffff", (darknessRatio - 0.5) * 200) :
            colorLib.mix("000000", "808080", darknessRatio * 200);
    }

    // Lighter/darker colors for control buttons and session buttons
    colors["color-weak"] = colorLib.mix(
        colors["color"], colors["background-color"], 85);
    colors["color-weaker"] = colorLib.mix(
        colors["color"], colors["background-color"], 75);
    colors["color-weakest"] = colorLib.mix(
        colors["color"], colors["background-color"], 50);
    colors["hover-color"] = colorLib.applyAlpha(colors["color"], 0.15);

    // Greenish/reddish colors to signal whether something is correct/wrong
    if ("color-correct" in colorScheme) {
        colors["color-correct"] = colorScheme["color-correct"];
    } else {
        colors["color-correct"] = isDarkBackground ?
            colorLib.mix("408000", "80ff00", (darknessRatio - 0.5) * 200) :
            colorLib.mix("80ff00", "408000", darknessRatio * 200);
    }
    if ("color-wrong" in colorScheme) {
        colors["color-wrong"] = colorScheme["color-wrong"];
    } else {
        colors["color-wrong"] = isDarkBackground ? 
            colorLib.mix("dd6c00", "ffb600", (darknessRatio - 0.5) * 200) :
            colorLib.mix("ffb600", "dd6c00", darknessRatio * 200);
    }

    // Lighter versions of greenish/reddish colors for gradients/shadows
    colors["color-correct-weak"] =
        colorLib.applyAlpha(colors["color-correct"], 0.5);
    colors["background-color-correct"] =
        colorLib.applyAlpha(colors["color-correct"], 0.2);
    colors["background-correct-strong"] = colorLib.applyAlpha(
        colorLib.mix(colors["color-correct"], colors["color"], 50), 0.3);
    colors["color-wrong-weak"] =
        colorLib.applyAlpha(colors["color-wrong"], 0.5);
    colors["background-color-wrong"] =
        colorLib.applyAlpha(colors["color-wrong"], 0.2);
    colors["background-wrong-strong"] = colorLib.applyAlpha(
        colorLib.mix(colors["color-wrong"], colors["color"], 50), 0.3);

    // Shadow color for improving contrast of test item and question
    if ("status-shadow-color" in colorScheme) {
        colors["status-shadow-color"] = colorScheme["status-shadow-color"];
    } else {
        const alpha = isDarkBackground ?
            (1 - (darknessRatio - 0.5) * 2) * 0.4 : darknessRatio * 2 * 0.4;
        colors["status-shadow-color"] = isDarkBackground ?
            `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
    }
    if ("item-shadow-color" in colorScheme) {
        colors["item-shadow-color"] = colorScheme["item-shadow-color"];
    } else {
        const alpha = isDarkBackground ?
            (1 - (darknessRatio - 0.5) * 2) * 0.2 : darknessRatio * 2 * 0.2;
        colors["item-shadow-color"] = isDarkBackground ?
            `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
    }

    return colors;
}

module.exports.mix = mix;
module.exports.getDarknessRatio = getDarknessRatio;
module.exports.isDark = isDark;
module.exports.applyAlpha = applyAlpha;
module.exports.isHex = isHex;
module.exports.assembleColors = assembleColors;
