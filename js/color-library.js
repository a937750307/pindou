// 色库管理模块
function ColorLibrary() {}

// 从 CSV 文本解析色库
ColorLibrary.prototype.importCSV = function(csvText) {
  var result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transform: function(value) { return value.trim(); }
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { success: false, message: 'CSV 解析失败：格式不正确' };
  }

  var rows = result.data;
  if (rows.length === 0) {
    return { success: false, message: 'CSV 为空' };
  }

  var palette = [];
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var code = row.code;
    var name = row.name;
    var hex = row.hex;

    if (!code || !name || !hex) {
      errors.push('第' + (i + 2) + '行：缺少必填字段（code, name, hex）');
      continue;
    }

    // 验证 hex 格式
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      errors.push('第' + (i + 2) + '行：hex 格式不正确（应为 #RRGGBB）');
      continue;
    }

    var h = hex.toUpperCase();
    palette.push({
      code: code,
      name: name,
      hex: h,
      rgb: [
        parseInt(h.slice(1, 3), 16),
        parseInt(h.slice(3, 5), 16),
        parseInt(h.slice(5, 7), 16)
      ]
    });
  }

  if (palette.length === 0) {
    return { success: false, message: '没有有效的颜色条目\n' + errors.join('\n') };
  }

  return {
    success: true,
    palette: palette,
    warnings: errors.length > 0 ? errors : null
  };
};

// 将色库导出为 CSV 文本
ColorLibrary.prototype.exportCSV = function(palette) {
  var lines = ['code,name,hex'];
  for (var i = 0; i < palette.length; i++) {
    var c = palette[i];
    lines.push(c.code + ',' + c.name + ',' + c.hex);
  }
  return lines.join('\n');
};

// 根据色系键搜索颜色
ColorLibrary.prototype.getColorsByFamily = function(palette, familyKey) {
  return palette.filter(function(c) {
    return c.code.charAt(0) === familyKey;
  });
};

// 搜索颜色
ColorLibrary.prototype.searchColors = function(palette, query) {
  if (!query) return palette;
  var q = query.toLowerCase();
  return palette.filter(function(c) {
    return c.code.toLowerCase().indexOf(q) !== -1 ||
           c.name.toLowerCase().indexOf(q) !== -1 ||
           c.hex.toLowerCase().indexOf(q) !== -1;
  });
};
