// 分享模块
function ShareManager() {}

// 将网格数据编码为 URL 哈希
ShareManager.prototype.encodeGrid = function(grid) {
  // 格式：cols rows index0 index1 index2 ...
  var data = [grid.cols, grid.rows];
  for (var i = 0; i < grid.cells.length; i++) {
    data.push(grid.cells[i]);
  }

  var str = data.join(',');
  var compressed = LZString.compressToBase64(str);

  return compressed;
};

// 从 URL 哈希解码网格数据
ShareManager.prototype.decodeGrid = function(hash) {
  try {
    var str = LZString.decompressFromBase64(hash);
    var parts = str.split(',').map(Number);
    var cols = parts[0];
    var rows = parts[1];
    var cells = new Uint8Array(parts.slice(2));
    return {
      cols: cols,
      rows: rows,
      cells: cells
    };
  } catch (e) {
    return null;
  }
};

// 获取当前页面的分享 URL
ShareManager.prototype.getShareURL = function(grid) {
  var hash = this.encodeGrid(grid);
  var base = window.location.origin + window.location.pathname;
  return base + '#v1:' + hash;
};

// 生成二维码
ShareManager.prototype.generateQR = function(grid, element) {
  var url = this.getShareURL(grid);
  element.innerHTML = '';

  new QRCode(element, {
    text: url,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  return url;
};
