// Canvas 渲染引擎
function CanvasEngine(canvas, grid, palette) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.grid = grid;
  this.palette = palette;

  // 视口状态
  this.offsetX = 0;
  this.offsetY = 0;
  this.scale = 1;
  this.beadSize = 5; // 基础珠子大小（像素）

  // 显示模式
  this.dotMode = false;
  this.showGrid = true;

  // 拖拽状态
  this.dragging = false;
  this.dragStartX = 0;
  this.dragStartY = 0;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
}

CanvasEngine.prototype.init = function() {
  this.resize();
  this.centerGrid();
  this._bindEvents();
  this.render();
};

CanvasEngine.prototype.centerGrid = function() {
  var rect = this.canvas.getBoundingClientRect();
  var w = rect.width;
  var h = rect.height;
  var totalW = this.grid.cols * this.beadSize;
  var totalH = this.grid.rows * this.beadSize;
  var fitScale = Math.min((w * 0.85) / totalW, (h * 0.85) / totalH);
  this.scale = Math.max(0.5, Math.min(fitScale, 20));
  this.offsetX = (w - totalW * this.scale) / 2;
  this.offsetY = (h - totalH * this.scale) / 2;
};

CanvasEngine.prototype.resize = function() {
  var dpr = window.devicePixelRatio || 1;
  var rect = this.canvas.getBoundingClientRect();
  this.canvas.width = rect.width * dpr;
  this.canvas.height = rect.height * dpr;
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

// 渲染主函数
CanvasEngine.prototype.render = function() {
  var ctx = this.ctx;
  var rect = this.canvas.getBoundingClientRect();
  var w = rect.width;
  var h = rect.height;
  var grid = this.grid;
  var palette = this.palette;
  var bs = this.beadSize * this.scale;
  var gap = this.scale * 0.35; // 珠子间距

  ctx.clearRect(0, 0, w, h);

  if (grid.isEmpty()) return;

  // 计算视口内可见的格子范围
  var startCol = Math.max(0, Math.floor((-this.offsetX) / bs) - 1);
  var endCol = Math.min(grid.cols, Math.ceil((w - this.offsetX) / bs) + 1);
  var startRow = Math.max(0, Math.floor((-this.offsetY) / bs) - 1);
  var endRow = Math.min(grid.rows, Math.ceil((h - this.offsetY) / bs) + 1);

  // 颜色缓存（避免大量 hex 重复解析）
  var colorCache = {};
  // 文本颜色缓存（同色只计算一次深浅）
  var textColorCache = {};

  for (var row = startRow; row < endRow; row++) {
    for (var col = startCol; col < endCol; col++) {
      var ci = grid.getCell(col, row);
      if (ci === 0xFF) continue;

      var x = this.offsetX + col * bs;
      var y = this.offsetY + row * bs;

      // 获取颜色
      var color = palette[ci];
      if (!color) continue;
      var hex = color.hex;

      if (this.dotMode) {
        // 圆点模式
        var cx = x + bs / 2;
        var cy = y + bs / 2;
        var r = (bs - gap * 2) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(r, 1), 0, Math.PI * 2);
        ctx.fillStyle = hex;
        ctx.fill();
      } else {
        // 方块模式（带轻微圆角）
        var rx = x + gap;
        var ry = y + gap;
        var rw = bs - gap * 2;
        var rh = bs - gap * 2;
        var radius = Math.max(this.scale * 0.4, 0.5);
        this._roundRect(ctx, rx, ry, rw, rh, radius);
        ctx.fillStyle = hex;
        ctx.fill();
      }
    }
  }

  // 色号文字（分开绘制，确保在珠子上面）
  if (bs >= 8) { // 太小不绘文字
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var ci = grid.getCell(col, row);
        if (ci === 0xFF) continue;
        var color = palette[ci];
        if (!color) continue;

        var x = this.offsetX + col * bs;
        var y = this.offsetY + row * bs;

        // 文字颜色：根据底色深浅
        var textColor = this._getTextColor(color.hex);
        ctx.fillStyle = textColor;
        var fontSize = Math.max(Math.min(bs * 0.32, 11), 5);
        ctx.font = fontSize + 'px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(color.code, x + bs / 2, y + bs / 2);
      }
    }
  }

  // 九宫格线（3x3 分割，覆盖在珠子上方）
  if (this.showGrid) {
    var gx1 = this.offsetX + (grid.cols / 3) * bs;
    var gx2 = this.offsetX + (2 * grid.cols / 3) * bs;
    var gy1 = this.offsetY + (grid.rows / 3) * bs;
    var gy2 = this.offsetY + (2 * grid.rows / 3) * bs;

    ctx.strokeStyle = 'rgba(128,128,128,0.35)';
    ctx.lineWidth = Math.max(this.scale * 0.6, 1);

    // 竖线
    ctx.beginPath();
    ctx.moveTo(gx1, this.offsetY + startRow * bs);
    ctx.lineTo(gx1, this.offsetY + endRow * bs);
    ctx.moveTo(gx2, this.offsetY + startRow * bs);
    ctx.lineTo(gx2, this.offsetY + endRow * bs);
    ctx.stroke();

    // 横线
    ctx.beginPath();
    ctx.moveTo(this.offsetX + startCol * bs, gy1);
    ctx.lineTo(this.offsetX + endCol * bs, gy1);
    ctx.moveTo(this.offsetX + startCol * bs, gy2);
    ctx.lineTo(this.offsetX + endCol * bs, gy2);
    ctx.stroke();
  }
};

CanvasEngine.prototype._roundRect = function(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

// 判断底色深浅，返回白色或黑色文字
CanvasEngine.prototype._getTextColor = function(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#1a1a1a' : '#e0e0e0';
};

// 鼠标事件绑定
CanvasEngine.prototype._bindEvents = function() {
  var self = this;
  var canvas = this.canvas;

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    var zoom = e.deltaY < 0 ? 1.1 : 0.9;
    var newScale = self.scale * zoom;
    newScale = Math.max(0.5, Math.min(40, newScale));

    // 以鼠标位置为中心缩放
    self.offsetX = mx - (mx - self.offsetX) * (newScale / self.scale);
    self.offsetY = my - (my - self.offsetY) * (newScale / self.scale);
    self.scale = newScale;

    self.render();
  });

  canvas.addEventListener('mousedown', function(e) {
    self.dragging = true;
    self.dragStartX = e.clientX;
    self.dragStartY = e.clientY;
    self.dragOffsetX = self.offsetX;
    self.dragOffsetY = self.offsetY;
  });

  window.addEventListener('mousemove', function(e) {
    if (!self.dragging) return;
    self.offsetX = self.dragOffsetX + (e.clientX - self.dragStartX);
    self.offsetY = self.dragOffsetY + (e.clientY - self.dragStartY);
    self.render();
  });

  window.addEventListener('mouseup', function() {
    self.dragging = false;
  });

  // 触屏支持
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      self.dragging = true;
      self.dragStartX = e.touches[0].clientX;
      self.dragStartY = e.touches[0].clientY;
      self.dragOffsetX = self.offsetX;
      self.dragOffsetY = self.offsetY;
    }
  });

  canvas.addEventListener('touchmove', function(e) {
    if (!self.dragging) return;
    e.preventDefault();
    self.offsetX = self.dragOffsetX + (e.touches[0].clientX - self.dragStartX);
    self.offsetY = self.dragOffsetY + (e.touches[0].clientY - self.dragStartY);
    self.render();
  });

  canvas.addEventListener('touchend', function() {
    self.dragging = false;
  });

  // 窗口大小变化
  window.addEventListener('resize', function() {
    self.resize();
    self.centerGrid();
    self.render();
  });
};

// 获取当前缩放百分比
CanvasEngine.prototype.getZoomPercent = function() {
  return Math.round(this.scale * 100);
};

// 重置视图
CanvasEngine.prototype.resetView = function() {
  this.centerGrid();
  this.render();
};

// 放大
CanvasEngine.prototype.zoomIn = function() {
  var rect = this.canvas.getBoundingClientRect();
  var cx = rect.width / 2;
  var cy = rect.height / 2;
  var newScale = Math.min(this.scale * 1.2, 40);
  this.offsetX = cx - (cx - this.offsetX) * (newScale / this.scale);
  this.offsetY = cy - (cy - this.offsetY) * (newScale / this.scale);
  this.scale = newScale;
  this.render();
};

// 缩小
CanvasEngine.prototype.zoomOut = function() {
  var rect = this.canvas.getBoundingClientRect();
  var cx = rect.width / 2;
  var cy = rect.height / 2;
  var newScale = Math.max(this.scale * 0.833, 0.5);
  this.offsetX = cx - (cx - this.offsetX) * (newScale / this.scale);
  this.offsetY = cy - (cy - this.offsetY) * (newScale / this.scale);
  this.scale = newScale;
  this.render();
};
