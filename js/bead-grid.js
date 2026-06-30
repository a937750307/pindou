// 拼豆网格数据模型
function BeadGrid(cols, rows) {
  this.cols = cols || 57;
  this.rows = rows || 57;
  this.cells = new Uint8Array(this.cols * this.rows);
  this.clear();
}

BeadGrid.prototype.clear = function() {
  this.cells.fill(0xFF);
};

BeadGrid.prototype.resize = function(cols, rows) {
  var old = this.cells;
  var oldCols = this.cols;
  var oldRows = this.rows;
  this.cols = cols;
  this.rows = rows;
  this.cells = new Uint8Array(cols * rows);
  this.cells.fill(0xFF);

  // 保留旧数据中重叠区域
  var minCols = Math.min(oldCols, cols);
  var minRows = Math.min(oldRows, rows);
  for (var y = 0; y < minRows; y++) {
    for (var x = 0; x < minCols; x++) {
      this.cells[y * cols + x] = old[y * oldCols + x];
    }
  }
};

BeadGrid.prototype.setCell = function(col, row, colorIndex) {
  if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
    this.cells[row * this.cols + col] = colorIndex;
  }
};

BeadGrid.prototype.getCell = function(col, row) {
  if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
    return this.cells[row * this.cols + col];
  }
  return 0xFF;
};

// 从颜色索引数组加载数据
BeadGrid.prototype.loadData = function(cols, rows, data) {
  this.cols = cols;
  this.rows = rows;
  this.cells = new Uint8Array(data);
};

// 检查是否有数据
BeadGrid.prototype.isEmpty = function() {
  for (var i = 0; i < this.cells.length; i++) {
    if (this.cells[i] !== 0xFF) return false;
  }
  return true;
};
