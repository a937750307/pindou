// 统计模块
function StatsCalculator() {}

// 计算用豆统计
StatsCalculator.prototype.getStats = function(grid, palette) {
  var counts = {};
  var total = 0;

  for (var i = 0; i < grid.cells.length; i++) {
    var ci = grid.cells[i];
    if (ci !== 0xFF && ci < palette.length) {
      var code = palette[ci].code;
      counts[code] = (counts[code] || 0) + 1;
      total++;
    }
  }

  // 按数量降序排列
  var distribution = [];
  for (var code in counts) {
    var idx = palette.findIndex(function(c) { return c.code === code; });
    distribution.push({
      code: code,
      name: idx >= 0 ? palette[idx].name : '',
      hex: idx >= 0 ? palette[idx].hex : '#000',
      count: counts[code]
    });
  }
  distribution.sort(function(a, b) { return b.count - a.count; });

  // 底板数估算（按标准底板尺寸）
  var standardCells = STANDARD_BOARD_SIZE * STANDARD_BOARD_SIZE;
  var boardCount = Math.ceil(total / standardCells);

  // 预估制作时长（每珠 1.5 秒）
  var estimatedMinutes = Math.ceil(total * 1.5 / 60);

  return {
    totalBeads: total,
    boardCount: boardCount,
    estimatedMinutes: estimatedMinutes,
    colorCount: distribution.length,
    distribution: distribution
  };
};

// 获取颜色数量最多的前N个
StatsCalculator.prototype.getTopColors = function(stats, n) {
  return stats.distribution.slice(0, n);
};
