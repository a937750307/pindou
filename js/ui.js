// UI 管理模块
function UIManager(engine, grid, palette, processor, exporter) {
  this.engine = engine;
  this.grid = grid;
  this.palette = palette;
  this.processor = processor;
  this.exporter = exporter;

  // 当前图片
  this.currentImage = null;
}

UIManager.prototype.init = function() {
  var self = this;

  // 文件导入按钮
  document.getElementById('upload-btn').addEventListener('click', function() {
    document.getElementById('file-input').click();
  });

  // 使用说明按钮
  document.getElementById('readme-btn').addEventListener('click', function() {
    window.open('README.html', '_blank');
  });

  document.getElementById('file-input').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      self._loadImage(e.target.files[0]);
    }
  });

  // 拖拽上传
  var canvas = document.getElementById('canvas');
  canvas.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  canvas.addEventListener('drop', function(e) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      self._loadImage(e.dataTransfer.files[0]);
    }
  });

  // 参数调节
  this._bindSlider('brightness', function(val) {
    document.getElementById('brightness-val').textContent = val;
    self._reprocess();
  });

  this._bindSlider('contrast', function(val) {
    document.getElementById('contrast-val').textContent = val;
    self._reprocess();
  });

  this._bindSlider('saturation', function(val) {
    document.getElementById('saturation-val').textContent = val;
    self._reprocess();
  });

  // 缩放模式
  document.getElementById('scale-mode').addEventListener('change', function() {
    self._reprocess();
  });

  // 抖动
  document.getElementById('dither').addEventListener('change', function() {
    self._reprocess();
  });

  // 显示模式
  document.getElementById('dot-mode').addEventListener('change', function() {
    self.engine.dotMode = this.checked;
    self.engine.render();
  });

  // 网格线
  document.getElementById('show-grid').addEventListener('change', function() {
    self.engine.showGrid = this.checked;
    self.engine.render();
  });

  // 九宫格线颜色
  document.getElementById('grid-color').addEventListener('change', function() {
    self.engine.gridLineColor = this.value;
    self.engine.render();
  });

  // 编辑模式
  document.getElementById('edit-mode').addEventListener('change', function() {
    self.engine.editMode = this.checked;
    self.engine.hoveredCell = null;
    self.engine.render();
  });

  // 监听编辑请求事件：弹出色号输入框
  self.engine.canvas.addEventListener('editCellRequest', function(e) {
    var detail = e.detail;
    var currentIdx = self.grid.getCell(detail.col, detail.row);
    var currentCode = currentIdx !== 0xFF && currentIdx < self.palette.length ? self.palette[currentIdx].code : '';
    var input = prompt('请输入色号 (如 D12):', currentCode);
    if (!input) return;
    input = input.trim().toUpperCase();
    var found = self.palette.findIndex(function(c) { return c.code === input; });
    if (found >= 0) {
      self.grid.setCell(detail.col, detail.row, found);
      self.engine.render();
    } else {
      alert('色号 "' + input + '" 不存在，请从色库中查找正确的色号');
    }
  });

  // 面板尺寸
  document.getElementById('grid-preset').addEventListener('change', function() {
    var val = this.value;
    if (val === 'custom') {
      self._promptGridSize();
    } else {
      var size = parseInt(val);
      self.grid.resize(size, size);
      self.engine.resize();
      self.engine.centerGrid();
      self._reprocess();
    }
  });

  // 导出按钮
  document.getElementById('export-pdf').addEventListener('click', function() {
    if (self.grid.isEmpty()) {
      alert('请先导入一张图片');
      return;
    }
    self.exporter.exportPDF(self.grid, self.palette, {
      showGrid: self.engine.showGrid,
      gridLineColor: self.engine.gridLineColor
    });
  });

  document.getElementById('export-png').addEventListener('click', function() {
    if (self.grid.isEmpty()) {
      alert('请先导入一张图片');
      return;
    }
    self.exporter.exportPNG(self.grid, self.palette, {
      scale: 2,
      showGrid: self.engine.showGrid,
      dotMode: self.engine.dotMode,
      gridLineColor: self.engine.gridLineColor
    });
  });

  document.getElementById('export-svg').addEventListener('click', function() {
    if (self.grid.isEmpty()) {
      alert('请先导入一张图片');
      return;
    }
    self.exporter.exportSVG(self.grid, self.palette, {
      showGrid: self.engine.showGrid,
      dotMode: self.engine.dotMode,
      gridLineColor: self.engine.gridLineColor
    });
  });

  document.getElementById('export-csv').addEventListener('click', function() {
    if (self.grid.isEmpty()) {
      alert('请先导入一张图片');
      return;
    }
    self.exporter.exportCSV(self.grid, self.palette);
  });

  // 色库按钮
  document.getElementById('color-lib-btn').addEventListener('click', function() {
    document.getElementById('color-overlay').classList.toggle('active');
    if (document.getElementById('color-overlay').classList.contains('active')) {
      self._buildColorLibrary();
    }
  });

  document.getElementById('color-overlay-close').addEventListener('click', function() {
    document.getElementById('color-overlay').classList.remove('active');
  });

  // 导入/导出色库
  document.getElementById('import-csv-btn').addEventListener('click', function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var result = new ColorLibrary().importCSV(ev.target.result);
          if (result.success) {
            self.palette = result.palette;
            self.processor.setPalette(result.palette);
            self._rebuildColorIndexes();
            self._buildColorLibrary();
            self._reprocess();
            if (result.warnings) {
              alert('导入成功（部分行有警告）:\n' + result.warnings.join('\n'));
            }
          } else {
            alert('导入失败: ' + result.message);
          }
        };
        reader.readAsText(e.target.files[0]);
      }
    });
    input.click();
  });

  document.getElementById('reset-palette-btn').addEventListener('click', function() {
    self.palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
    self.palette.forEach(function(c, i) { c.index = i; });
    self.processor.setPalette(self.palette);
    self._buildColorLibrary();
    self._reprocess();
  });

  document.getElementById('export-csv-palette-btn').addEventListener('click', function() {
    var csvText = new ColorLibrary().exportCSV(self.palette);
    var blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '拼豆色库_' + self.palette.length + '色.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 色库搜索
  var searchTimer;
  document.getElementById('color-search').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      self._buildColorLibrary();
    }, 200);
  });

  // 首次调整大小
  window.addEventListener('load', function() {
    self.engine.resize();
    self.engine.centerGrid();
    self.engine.render();
  });

  // 窗口变化时重新渲染
  window.addEventListener('resize', function() {
    self.engine.resize();
    self.engine.centerGrid();
    self.engine.render();
  });
};

// 加载图片
UIManager.prototype._loadImage = function(file) {
  var self = this;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      self.currentImage = img;
      self._reprocess();
      document.getElementById('empty-hint').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// 重新处理图片
UIManager.prototype._reprocess = function() {
  if (!this.currentImage) return;

  var brightness = parseInt(document.getElementById('brightness').value);
  var contrast = parseInt(document.getElementById('contrast').value);
  var saturation = parseInt(document.getElementById('saturation').value);
  var scaleMode = document.getElementById('scale-mode').value;
  var dither = document.getElementById('dither').checked;

  var options = {
    cols: this.grid.cols,
    rows: this.grid.rows,
    brightness: brightness,
    contrast: contrast,
    saturation: saturation,
    scaleMode: scaleMode,
    dither: dither
  };

  var result = this.processor.process(this.currentImage, options);
  this.grid.loadData(options.cols, options.rows, result);
  this.engine.render();

  // 更新缩放百分比
  document.getElementById('zoom-level').textContent = this.engine.getZoomPercent() + '%';
};

// 绑定滑块事件
UIManager.prototype._bindSlider = function(id, callback) {
  var el = document.getElementById(id);
  el.addEventListener('input', function() {
    callback(parseInt(this.value));
  });
};

// 弹出自定义网格尺寸对话框
UIManager.prototype._promptGridSize = function() {
  var self = this;
  var size = prompt('输入底板尺寸（一行珠子数）:', '50');
  if (size && parseInt(size) > 0 && parseInt(size) <= 200) {
    var s = parseInt(size);
    self.grid.resize(s, s);
    self.engine.resize();
    self.engine.centerGrid();
    self._reprocess();
  } else if (size && !isNaN(parseInt(size))) {
    alert('尺寸需在 1-200 之间');
    document.getElementById('grid-preset').value = '50';
  } else {
    document.getElementById('grid-preset').value = '50';
  }
};

// 构建色库界面
UIManager.prototype._buildColorLibrary = function() {
  var self = this;
  var query = document.getElementById('color-search').value;
  var lib = new ColorLibrary();

  // 过滤颜色
  var filtered = lib.searchColors(this.palette, query);

  // 色系筛选按钮
  var familiesDiv = document.getElementById('color-families');
  var activeFamily = familiesDiv.querySelector('.active');
  var activeKey = activeFamily ? activeFamily.dataset.key : null;

  // 构建色系按钮
  var familyHTML = '';
  COLOR_FAMILIES.forEach(function(f) {
    var cls = 'family-btn';
    if (!activeKey || activeKey === f.key) cls += ' active';
    familyHTML += '<span class="' + cls + '" data-key="' + f.key + '">' + f.name + '(' + lib.getColorsByFamily(self.palette, f.key).length + ')</span>';
  });
  // 添加"全部"按钮
  familyHTML = '<span class="family-btn' + (!activeKey ? ' active' : '') + '" data-key="">全部(' + self.palette.length + ')</span>' + familyHTML;
  familiesDiv.innerHTML = familyHTML;

  // 绑定色系筛选
  familiesDiv.querySelectorAll('.family-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      familiesDiv.querySelectorAll('.family-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      self._buildColorLibrary();
    });
  });

  // 按色系筛选
  if (activeKey) {
    filtered = filtered.filter(function(c) { return c.code.charAt(0) === activeKey; });
  }

  // 显示颜色网格
  var gridDiv = document.getElementById('color-grid-list');
  var html = '';
  filtered.forEach(function(c) {
    html += '<div class="color-card">' +
      '<div class="color-swatch" style="background:' + c.hex + '"></div>' +
      '<div class="color-info">' +
        '<span class="color-code">' + c.code + '</span>' +
        '<span class="color-name">' + c.name + '</span>' +
        '<span class="color-hex">' + c.hex + '</span>' +
      '</div>' +
    '</div>';
  });
  gridDiv.innerHTML = html;
};

// 重建颜色索引
UIManager.prototype._rebuildColorIndexes = function() {
  for (var i = 0; i < this.palette.length; i++) {
    this.palette[i].index = i;
  }
};
