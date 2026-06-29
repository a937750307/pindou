// 导出模块
function Exporter() {}

// PDF 矢量图纸导出
Exporter.prototype.exportPDF = function(grid, palette, options) {
  options = options || {};
  var pageSize = options.pageSize || 'a4';
  var orientation = options.orientation || 'p'; // portrait
  var showGrid = options.showGrid !== false;

  // 使用全局 jsPDF
  var doc = new jspdf.jsPDF({ orientation: orientation, unit: 'mm', format: pageSize });
  var pageW = doc.internal.pageSize.getWidth();
  var pageH = doc.internal.pageSize.getHeight();
  var margin = 10;
  var beadSize = 4; // 每珠 4mm
  var gap = 0.2;

  var usableW = pageW - margin * 2;
  var usableH = pageH - margin * 2;

  var beadsPerRow = Math.floor(usableW / beadSize);
  var beadsPerCol = Math.floor(usableH / beadSize);

  var totalPagesX = Math.ceil(grid.cols / beadsPerRow);
  var totalPagesY = Math.ceil(grid.rows / beadsPerCol);
  var totalPages = totalPagesX * totalPagesY;

  for (var py = 0; py < totalPagesY; py++) {
    for (var px = 0; px < totalPagesX; px++) {
      if (px > 0 || py > 0) {
        doc.addPage();
      }

      var startCol = px * beadsPerRow;
      var startRow = py * beadsPerCol;
      var endCol = Math.min(startCol + beadsPerRow, grid.cols);
      var endRow = Math.min(startRow + beadsPerCol, grid.rows);

      // 绘制珠子
      var hx = margin + (totalPagesX > 1 ? px : 0) * ((usableW - (endCol - startCol) * beadSize) / 2);
      for (var row = startRow; row < endRow; row++) {
        for (var col = startCol; col < endCol; col++) {
          var ci = grid.getCell(col, row);
          if (ci === 0xFF || ci >= palette.length) continue;

          var color = palette[ci];
          var x = hx + (col - startCol) * beadSize + gap;
          var y = margin + (row - startRow) * beadSize + gap;

          // 珠子方块
          doc.setFillColor(color.hex);
          doc.rect(x, y, beadSize - gap * 2, beadSize - gap * 2, 'F');

          // 色号文字（如果珠子够大）
          if (beadSize >= 3.5) {
            doc.setFontSize(2.5);
            doc.setTextColor(this._getTextColorForPDF(color.hex));
            doc.text(color.code, x + beadSize / 2, y + beadSize / 2 + 0.8, { align: 'center' });
          }
        }
      }

      // 网格线
      if (showGrid) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.05);
        for (var row = startRow; row <= endRow; row++) {
          var y = margin + (row - startRow) * beadSize;
          doc.line(hx, y, hx + (endCol - startCol) * beadSize, y);
        }
        for (var col = startCol; col <= endCol; col++) {
          var x = hx + (col - startCol) * beadSize;
          doc.line(x, margin, x, margin + (endRow - startRow) * beadSize);
        }
      }

      // 页码
      var pageNum = py * totalPagesX + px + 1;
      doc.setFontSize(6);
      doc.setTextColor(128, 128, 128);
      doc.text('第 ' + pageNum + ' / ' + totalPages + ' 页', pageW / 2, pageH - 5, { align: 'center' });
    }
  }

  // 最后一页：图例 + 统计
  doc.addPage();
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text('颜色图例 & 用豆统计', margin, margin + 5);

  var stats = new StatsCalculator().getStats(grid, palette);

  // 图例表格
  var legendY = margin + 12;
  var colCount = 4;
  var colWidth = (pageW - margin * 2) / colCount;
  var rowHeight = 6;
  var itemsPerCol = Math.ceil(stats.distribution.length / colCount);

  doc.setFontSize(5);
  for (var i = 0; i < stats.distribution.length; i++) {
    var cIdx = Math.floor(i / itemsPerCol);
    var rIdx = i % itemsPerCol;
    var item = stats.distribution[i];

    var lx = margin + cIdx * colWidth;
    var ly = legendY + rIdx * rowHeight;

    // 色块
    doc.setFillColor(item.hex);
    doc.rect(lx, ly, 3, 3, 'F');
    // 文字
    doc.setTextColor(50, 50, 50);
    doc.text(item.code + ' ' + item.name + ' x' + item.count, lx + 4, ly + 2.5);
  }

  // 统计摘要
  var summaryY = legendY + (itemsPerCol + 2) * rowHeight;
  doc.setFontSize(7);
  doc.text('总用豆: ' + stats.totalBeads + ' | 颜色数: ' + stats.colorCount +
           ' | 底板: ' + stats.boardCount + '块 | 预计耗时: ' + stats.estimatedMinutes + '分钟',
           margin, summaryY);

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
    ctx.strokeStyle = 'rgba(180,180,180,0.3)';
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
    svg.push('<g stroke="#cccccc" stroke-width="0.1">');
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
