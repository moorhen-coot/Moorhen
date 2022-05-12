/* @license
 * pixi.js - v1.5.1
 * Copyright (c) 2012-2014, Mat Groves
 * http://goodboydigital.com/
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * http://stackoverflow.com/users/34441/ellisbben
 * great solution to the problem!
 * returns the height of the given font
 *
 * @method determineFontHeight
 * @param fontStyle {Object}
 * @private
 */
function determineFontHeight(fontStyle,fnsize) {
    var result;
    let fontDraw = document.createElement("canvas");
    fontDraw.height = 2*fnsize;
    fontDraw.width = 2*fnsize;
    let ctx = fontDraw.getContext('2d');
    ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'white';
    ctx.font = fontStyle;
    ctx.fillText('gM', 0, 0);
    let pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
    let start = -1;
    let end = -1;
    for (let row = 0; row < fontDraw.height; row++) 
    {
      for (let column = 0; column < fontDraw.width; column++) 
      {
        let index = (row * fontDraw.width + column) * 4;
        if (pixels[index] === 0) {
          if (column === fontDraw.width - 1 && start !== -1) {
            end = row;
            row = fontDraw.height;
            break;
          }
          continue;
        }
        else 
        {
          if (start === -1) 
          {
            start = row;
          }
          break;
        }
      }
    }
    result = end - start;
    return result;
};

export {determineFontHeight};
