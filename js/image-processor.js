// 图片转换引擎
function ImageProcessor(palette) {
  this.palette = palette;
}

ImageProcessor.prototype.setPalette = function(palette) {
  this.palette = palette;
};

// 主处理函数
// options: { cols, rows, brightness, contrast, saturation, scaleMode, dither }
ImageProcessor.prototype.process = function(image, options) {
  var cols = options.cols || 50;
  var rows = options.rows || 50;
  var brightness = options.brightness || 0;
  var contrast = (options.contrast || 100) / 100;
  var saturation = (options.saturation || 100) / 100;
  var scaleMode = options.scaleMode || 'cover';
  var dither = options.dither !== false;

  // Step 1: 创建离屏 Canvas，缩放马赛克化
  var offCanvas = document.createElement('canvas');
  offCanvas.width = cols;
  offCanvas.height = rows;
  var offCtx = offCanvas.getContext('2d');

  var imgW = image.width;
  var imgH = image.height;

  // 计算缩放和裁切参数
  var sx, sy, sw, sh, dx, dy, dw, dh;

  if (scaleMode === 'cover') {
    // 裁切填充：缩放至覆盖整个底板
    var scaleW = cols / imgW;
    var scaleH = rows / imgH;
    var scale = Math.max(scaleW, scaleH);
    sw = cols / scale;
    sh = rows / scale;
    sx = (imgW - sw) / 2;
    sy = (imgH - sh) / 2;
    dx = 0; dy = 0; dw = cols; dh = rows;
  } else {
    // 完整适配：缩放至刚好放入底板
    var scaleW = cols / imgW;
    var scaleH = rows / imgH;
    var scale = Math.min(scaleW, scaleH);
    sw = imgW;
    sh = imgH;
    sx = 0; sy = 0;
    dw = Math.round(imgW * scale);
    dh = Math.round(imgH * scale);
    dx = Math.floor((cols - dw) / 2);
    dy = Math.floor((rows - dh) / 2);
    // 整个画布先填充空白
    offCtx.clearRect(0, 0, cols, rows);
  }

  offCtx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

  // 读取像素数据
  var imageData = offCtx.getImageData(0, 0, cols, rows);
  var pixels = imageData.data; // RGBA 数组

  // Step 2: 颜色调整 + 转换
  var result = new Uint8Array(cols * rows);
  result.fill(0xFF);

  for (var i = 0; i < cols * rows; i++) {
    var idx = i * 4;
    var r = pixels[idx];
    var g = pixels[idx + 1];
    var b = pixels[idx + 2];
    var a = pixels[idx + 3];

    // 透明像素跳过
    if (a < 128) continue;

    // 亮度调整
    r = this._adjustBrightness(r, brightness);
    g = this._adjustBrightness(g, brightness);
    b = this._adjustBrightness(b, brightness);

    // 对比度调整
    r = this._adjustContrast(r, contrast);
    g = this._adjustContrast(g, contrast);
    b = this._adjustContrast(b, contrast);

    // 饱和度调整
    var hsl = this._rgbToHsl(r, g, b);
    hsl[1] = Math.max(0, Math.min(1, hsl[1] * saturation));
    var rgb = this._hslToRgb(hsl[0], hsl[1], hsl[2]);
    r = rgb[0];
    g = rgb[1];
    b = rgb[2];

    // 暂存调整后的 RGB（用于抖动误差传播）
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
  }

  // Step 3: 颜色匹配（带抖动）
  var errors = new Float32Array(cols * rows * 3);

  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var idx = (y * cols + x) * 4;
      var r = pixels[idx];
      var g = pixels[idx + 1];
      var b = pixels[idx + 2];
      var a = pixels[idx + 3];

      if (a < 128) continue;

      // 应用累积误差
      var ei = (y * cols + x) * 3;
      r = r + errors[ei];
      g = g + errors[ei + 1];
      b = b + errors[ei + 2];

      // 裁剪
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // 寻找最接近的颜色
      var bestIdx = this._findClosestColor(r, g, b);
      result[y * cols + x] = bestIdx;

      // 抖动误差传播（Floyd-Steinberg）
      if (dither && bestIdx < this.palette.length) {
        var matched = this.palette[bestIdx].rgb;
        var errR = r - matched[0];
        var errG = g - matched[1];
        var errB = b - matched[2];

        // 右侧
        if (x + 1 < cols) {
          var ni = (y * cols + x + 1) * 3;
          errors[ni]     += errR * 7 / 16;
          errors[ni + 1] += errG * 7 / 16;
          errors[ni + 2] += errB * 7 / 16;
        }
        // 左下
        if (x - 1 >= 0 && y + 1 < rows) {
          var ni = ((y + 1) * cols + x - 1) * 3;
          errors[ni]     += errR * 3 / 16;
          errors[ni + 1] += errG * 3 / 16;
          errors[ni + 2] += errB * 3 / 16;
        }
        // 下方
        if (y + 1 < rows) {
          var ni = ((y + 1) * cols + x) * 3;
          errors[ni]     += errR * 5 / 16;
          errors[ni + 1] += errG * 5 / 16;
          errors[ni + 2] += errB * 5 / 16;
        }
        // 右下
        if (x + 1 < cols && y + 1 < rows) {
          var ni = ((y + 1) * cols + x + 1) * 3;
          errors[ni]     += errR * 1 / 16;
          errors[ni + 1] += errG * 1 / 16;
          errors[ni + 2] += errB * 1 / 16;
        }
      }
    }
  }

  // Step 4: 邻域清理 —— 消除深色区域中的孤立浅色块
  result = this._cleanIsolatedSpots(result, cols, rows);

  return result;
};

// 寻找最接近的色库颜色（加权欧几里得距离 + 亮度惩罚）
ImageProcessor.prototype._findClosestColor = function(r, g, b) {
  var bestDist = Infinity;
  var bestIdx = 0;
  var palette = this.palette;

  // 源像素的感知亮度
  var srcLum = 0.299 * r + 0.587 * g + 0.114 * b;

  for (var i = 0; i < palette.length; i++) {
    var c = palette[i].rgb;
    var dr = r - c[0];
    var dg = g - c[1];
    var db = b - c[2];
    // 色库颜色的感知亮度
    var palLum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    var dl = srcLum - palLum;
    // 加权 RGB 距离 + 亮度惩罚：亮度权重远高于色相，防止深色区域出现亮色或反之
    var dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db + 40 * dl * dl;
    // A05 珍珠白抑制：该色容易在暗区形成孤立亮块，给予额外 20% 距离惩罚
    if (palette[i].code === 'A05') {
      dist *= 1.2;
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
};

// 邻域清理：消除深色区域中的孤立浅色块（通用亮度检测版本）
// 若一个 A 系色块（白色/米色）的亮度显著高于大多数邻居（差值 > 50），替换为投票最多的邻居色号
// 不限定邻居色系，红色、黑色、深蓝等任何暗区中的白点都会被清理
ImageProcessor.prototype._cleanIsolatedSpots = function(result, cols, rows) {
  var palette = this.palette;
  var LUMINANCE_THRESHOLD = 50; // 亮度差阈值：邻居比当前格暗 50 以上才算"更暗"

  // 判断是否为 A 系（白色/米色）
  function isALight(idx) {
    if (idx >= palette.length) return false;
    return palette[idx].code.charAt(0) === 'A';
  }

  // 计算感知亮度 ITU-R BT.601
  function getLuminance(idx) {
    var c = palette[idx].rgb;
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  }

  // 8 邻域偏移
  var neighborOffsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1]
  ];

  // 两轮清理
  for (var pass = 0; pass < 2; pass++) {
    var changed = false;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ci = result[y * cols + x];
        if (ci === 0xFF) continue;
        if (!isALight(ci)) continue;

        var cellLum = getLuminance(ci);
        var darkerNeighbors = [];
        var voteMap = {}; // 邻居色号投票

        for (var n = 0; n < neighborOffsets.length; n++) {
          var nx = x + neighborOffsets[n][0];
          var ny = y + neighborOffsets[n][1];
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          var ni = result[ny * cols + nx];
          if (ni === 0xFF) continue;

          // 邻居明显更暗（亮度差 > 50）
          if (cellLum - getLuminance(ni) > LUMINANCE_THRESHOLD) {
            darkerNeighbors.push(ni);
            voteMap[ni] = (voteMap[ni] || 0) + 1;
          }
        }

        // 如果 5+ 个邻居明显更暗，替换为投票最多的邻居色
        if (darkerNeighbors.length >= 5) {
          var bestVote = 0;
          var bestColor = darkerNeighbors[0];
          for (var code in voteMap) {
            if (voteMap[code] > bestVote) {
              bestVote = voteMap[code];
              bestColor = parseInt(code);
            }
          }
          result[y * cols + x] = bestColor;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return result;
};

// 亮度调整
ImageProcessor.prototype._adjustBrightness = function(val, delta) {
  return Math.max(0, Math.min(255, val + delta));
};

// 对比度调整
ImageProcessor.prototype._adjustContrast = function(val, factor) {
  return Math.max(0, Math.min(255, (val - 128) * factor + 128));
};

// RGB 转 HSL
ImageProcessor.prototype._rgbToHsl = function(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
};

// HSL 转 RGB
ImageProcessor.prototype._hslToRgb = function(h, s, l) {
  var r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    var hue2rgb = function(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};
