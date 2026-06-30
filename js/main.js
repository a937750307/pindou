// 拼豆底卡生成器 - 主入口
(function() {
  // 初始化色板（深拷贝默认色板）
  var palette = JSON.parse(JSON.stringify(DEFAULT_PALETTE));
  palette.forEach(function(c, i) { c.index = i; });

  // 创建数据模型
  var grid = new BeadGrid(57, 57);

  // 获取 Canvas
  var canvas = document.getElementById('canvas');

  // 创建渲染引擎
  var engine = new CanvasEngine(canvas, grid, palette);
  engine.init();

  // 创建其他模块
  var processor = new ImageProcessor(palette);
  var exporter = new Exporter();

  // 创建 UI 管理器并初始化
  var ui = new UIManager(engine, grid, palette, processor, exporter);
  ui.init();

  // 创建快捷键管理器
  var shortcuts = new ShortcutsManager(engine);
  shortcuts.init();

  // 初始渲染
  engine.resize();
  engine.centerGrid();
  engine.render();

  // 更新缩放百分比（同步渲染变化）
  var origRender = engine.render;
  engine.render = function() {
    origRender.apply(engine, arguments);
    document.getElementById('zoom-level').textContent = engine.getZoomPercent() + '%';
  };
})();
