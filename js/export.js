// 导出模块
function Exporter() {}

// PDF 导出（基于 Canvas 绘制，避免中文乱码和分页）
Exporter.prototype.exportPDF = function(grid, palette, options) {
  options = options || {};
  var showGrid = options.showGrid !== false;
  var gridLineColor = options.gridLineColor || 'white';

  // === 第一页：完整拼豆图纸 ===
  var scale = 2;
  var beadPx = 20 * scale;
  var canvas = document.createElement('canvas');
  canvas.width = grid.cols * beadPx;
  canvas.height = grid.rows * beadPx;
  var ctx = canvas.getContext('2d');

  // 白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var gap = scale;

  // 绘制珠子
  for (var row = 0; row < grid.rows; row++) {
    for (var col = 0; col < grid.cols; col++) {
      var ci = grid.getCell(col, row);
      if (ci === 0xFF || ci >= palette.length) continue;

      var color = palette[ci];
      var x = col * beadPx;
      var y = row * beadPx;

      // 方块
      ctx.fillStyle = color.hex;
      var rx = x + gap;
      var ry = y + gap;
      var rw = beadPx - gap * 2;
      var rh = beadPx - gap * 2;
      ctx.fillRect(rx, ry, rw, rh);

      // 色号文字
      var brightness = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
      ctx.fillStyle = brightness > 140 ? '#1a1a1a' : '#e0e0e0';
      var fontSize = Math.max(beadPx * 0.32, 8);
      ctx.font = fontSize + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.code, x + beadPx / 2, y + beadPx / 2);
    }
  }

  // 网格线
  if (showGrid) {
    var lineColors = {
      white: 'rgba(255,255,255,0.7)',
      black: 'rgba(0,0,0,0.5)',
      red: 'rgba(255,0,0,0.5)',
      blue: 'rgba(0,0,255,0.5)'
    };
    ctx.strokeStyle = lineColors[gridLineColor] || lineColors.white;
    ctx.lineWidth = scale * 0.3;
    ctx.beginPath();
    for (var i = 0; i <= grid.cols; i++) {
      ctx.moveTo(i * beadPx, 0);
      ctx.lineTo(i * beadPx, grid.rows * beadPx);
    }
    for (var j = 0; j <= grid.rows; j++) {
      ctx.moveTo(0, j * beadPx);
      ctx.lineTo(grid.cols * beadPx, j * beadPx);
    }
    ctx.stroke();
  }

  // 转为图片
  var imgData = canvas.toDataURL('image/png');

  // === 第二页：图例 + 统计（也用 Canvas 绘制）===
  var stats = new StatsCalculator().getStats(grid, palette);

  var legendCanvas = document.createElement('canvas');
  // 估算图例页尺寸
  var legendCols = 4;
  var itemsPerCol = Math.ceil(stats.distribution.length / legendCols);
  var legendItemH = 40;
  var legendHeaderH = 80;
  var legendW = 800;
  var legendH = Math.max(600, legendHeaderH + itemsPerCol * legendItemH + 100);

  legendCanvas.width = legendW;
  legendCanvas.height = legendH;
  var lctx = legendCanvas.getContext('2d');

  // 白色背景
  lctx.fillStyle = '#ffffff';
  lctx.fillRect(0, 0, legendW, legendH);

  // 标题
  lctx.fillStyle = '#333333';
  lctx.font = 'bold 28px -apple-system, sans-serif';
  lctx.textAlign = 'left';
  lctx.textBaseline = 'top';
  lctx.fillText('颜色图例 & 用豆统计', 30, 30);

  // 统计摘要
  lctx.fillStyle = '#666666';
  lctx.font = '18px -apple-system, sans-serif';
  lctx.fillText('总用豆: ' + stats.totalBeads + ' | 颜色数: ' + stats.colorCount +
                ' | 底板: ' + stats.boardCount + '块 | 预计耗时: ' + stats.estimatedMinutes + '分钟',
                30, 70);

  // 图例表格
  var colWidth = (legendW - 60) / legendCols;
  var startY = 120;

  for (var i = 0; i < stats.distribution.length; i++) {
    var cIdx = Math.floor(i / itemsPerCol);
    var rIdx = i % itemsPerCol;
    var item = stats.distribution[i];

    var lx = 30 + cIdx * colWidth;
    var ly = startY + rIdx * legendItemH;

    // 色块
    lctx.fillStyle = item.hex;
    lctx.fillRect(lx, ly, 24, 24);

    // 文字
    lctx.fillStyle = '#333333';
    lctx.font = '16px -apple-system, sans-serif';
    lctx.textAlign = 'left';
    lctx.textBaseline = 'middle';
    lctx.fillText(item.code + ' ' + item.name + ' x' + item.count, lx + 30, ly + 12);
  }

  var legendImgData = legendCanvas.toDataURL('image/png');

  // === 创建 PDF ===
  var doc = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  var pageW = doc.internal.pageSize.getWidth();
  var pageH = doc.internal.pageSize.getHeight();
  var margin = 10;

  // 第一页：图纸
  var maxW = pageW - margin * 2;
  var maxH = pageH - margin * 2;
  var imgAspect = canvas.height / canvas.width;
  var imgW = maxW;
  var imgH = imgW * imgAspect;

  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH / imgAspect;
  }

  var x = margin + (maxW - imgW) / 2;
  var y = margin + (maxH - imgH) / 2;
  doc.addImage(imgData, 'PNG', x, y, imgW, imgH);

  // 第二页：图例
  doc.addPage();
  doc.addImage(legendImgData, 'PNG', margin, margin, maxW, maxH);

  doc.save('拼豆图纸_' + grid.cols + 'x' + grid.rows + '.pdf');
};

// PNG 高清位图导出
Exporter.prototype.exportPNG = function(grid, palette, options) {
  options = options || {};
  var scale = options.scale || 2;
  var showGrid = options.showGrid !== false;
  var dotMode = options.dotMode || false;

  var canvas = document.createElement('canvas');
  var beadPx = 20 * scale;
  canvas.width = grid.cols * beadPx;
  canvas.height = grid.rows * beadPx;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var gap = scale;

  for (var row = 0; row < grid.rows; row++) {
    for (var col = 0; col < grid.cols; col++) {
      var ci = grid.getCell(col, row);
      if (ci === 0xFF || ci >= palette.length) continue;

      var color = palette[ci];
      var x = col * beadPx;
      var y = row * beadPx;

      ctx.fillStyle = color.hex;
      if (dotMode) {
        var cx = x + beadPx / 2;
        var cy = y + beadPx / 2;
        var r = (beadPx - gap * 2) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(r, 1), 0, Math.PI * 2);
        ctx.fill();
      } else {
        var rx = x + gap;
        var ry = y + gap;
        var rw = beadPx - gap * 2;
        var rh = beadPx - gap * 2;
        ctx.fillRect(rx, ry, rw, rh);
      }

      // 色号文字
      var brightness = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
      ctx.fillStyle = brightness > 140 ? '#1a1a1a' : '#e0e0e0';
      var fontSize = Math.max(beadPx * 0.32, 8);
      ctx.font = fontSize + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.code, x + beadPx / 2, y + beadPx / 2);
    }
  }

  // 网格线
  if (showGrid) {
    var lineColors = {
      white: 'rgba(255,255,255,0.7)',
      black: 'rgba(0,0,0,0.5)',
      red: 'rgba(255,0,0,0.5)',
      blue: 'rgba(0,0,255,0.5)'
    };
    ctx.strokeStyle = lineColors[options.gridLineColor] || lineColors.white;
    ctx.lineWidth = scale * 0.3;
    ctx.beginPath();
    for (var i = 0; i <= grid.cols; i++) {
      ctx.moveTo(i * beadPx, 0);
      ctx.lineTo(i * beadPx, grid.rows * beadPx);
    }
    for (var j = 0; j <= grid.rows; j++) {
      ctx.moveTo(0, j * beadPx);
      ctx.lineTo(grid.cols * beadPx, j * beadPx);
    }
    ctx.stroke();
  }

  canvas.toBlob(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '拼豆图纸_' + grid.cols + 'x' + grid.rows + '.png';
    a.click();
    URL.revokeObjectURL(url);
  });
};

// SVG 矢量导出
Exporter.prototype.exportSVG = function(grid, palette, options) {
  options = options || {};
  var showGrid = options.showGrid !== false;
  var dotMode = options.dotMode || false;

  var beadMm = 5;
  var gap = 0.4;
  var totalW = grid.cols * beadMm;
  var totalH = grid.rows * beadMm;

  var svg = ['<?xml version="1.0" encoding="UTF-8"?>'];
  svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalW + ' ' + totalH + '"');
  svg.push('  width="' + totalW + 'mm" height="' + totalH + 'mm">');

  // 背景
  svg.push('<rect width="' + totalW + '" height="' + totalH + '" fill="#ffffff"/>');

  // 绘制每个珠子
  for (var row = 0; row < grid.rows; row++) {
    for (var col = 0; col < grid.cols; col++) {
      var ci = grid.getCell(col, row);
      if (ci === 0xFF || ci >= palette.length) continue;

      var color = palette[ci];
      var x = col * beadMm;
      var y = row * beadMm;

      if (dotMode) {
        var cx = x + beadMm / 2;
        var cy = y + beadMm / 2;
        var r = (beadMm - gap * 2) / 2;
        svg.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color.hex + '"/>');
      } else {
        svg.push('<rect x="' + (x + gap) + '" y="' + (y + gap) + '"');
        svg.push('  width="' + (beadMm - gap * 2) + '" height="' + (beadMm - gap * 2) + '"');
        svg.push('  rx="' + (beadMm * 0.08) + '" fill="' + color.hex + '"/>');
      }

      // 色号文字
      var brightness = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
      var textColor = brightness > 140 ? '#1a1a1a' : '#e0e0e0';
      svg.push('<text x="' + (x + beadMm / 2) + '" y="' + (y + beadMm / 2 + 1) + '"');
      svg.push('  text-anchor="middle" dominant-baseline="middle"');
      svg.push('  font-family="sans-serif" font-size="2" fill="' + textColor + '">');
      svg.push(color.code);
      svg.push('</text>');
    }
  }

  // 网格线
  if (showGrid) {
    var svgColors = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000',
      blue: '#0000ff'
    };
    svg.push('<g stroke="' + (svgColors[options.gridLineColor] || svgColors.white) + '" stroke-width="0.1">');
    for (var i = 0; i <= grid.cols; i++) {
      svg.push('<line x1="' + i * beadMm + '" y1="0" x2="' + i * beadMm + '" y2="' + totalH + '"/>');
    }
    for (var j = 0; j <= grid.rows; j++) {
      svg.push('<line x1="0" y1="' + j * beadMm + '" x2="' + totalW + '" y2="' + j * beadMm + '"/>');
    }
    svg.push('</g>');
  }

  svg.push('</svg>');

  var blob = new Blob([svg.join('\n')], { type: 'image/svg+xml' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '拼豆图纸_' + grid.cols + 'x' + grid.rows + '.svg';
  a.click();
  URL.revokeObjectURL(url);
};

// 材料清单 CSV 导出
Exporter.prototype.exportCSV = function(grid, palette) {
  var stats = new StatsCalculator().getStats(grid, palette);

  var lines = ['色号,颜色名称,数量,颜色代码'];
  for (var i = 0; i < stats.distribution.length; i++) {
    var item = stats.distribution[i];
    lines.push(item.code + ',' + item.name + ',' + item.count + ',' + item.hex);
  }

  // 汇总
  lines.push('');
  lines.push('总计,,,' + stats.totalBeads);
  lines.push('所需底板,,,' + stats.boardCount + '块(' + STANDARD_BOARD_SIZE + 'x' + STANDARD_BOARD_SIZE + ')');
  lines.push('预计耗时,,,' + stats.estimatedMinutes + '分钟');

  var csvText = lines.join('\n');
  var blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '拼豆材料清单_' + grid.cols + 'x' + grid.rows + '.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// PDF 文字颜色判断
Exporter.prototype._getTextColorForPDF = function(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? [30, 30, 30] : [220, 220, 220];
};
