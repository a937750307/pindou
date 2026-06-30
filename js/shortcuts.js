// 键盘快捷键
function ShortcutsManager(engine) {
  this.engine = engine;
}

ShortcutsManager.prototype.init = function() {
  var self = this;

  document.addEventListener('keydown', function(e) {
    // 忽略在输入框中输入的快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      self.engine.zoomIn();
    } else if (ctrl && e.key === '-') {
      e.preventDefault();
      self.engine.zoomOut();
    } else if (ctrl && e.key === '0') {
      e.preventDefault();
      self.engine.resetView();
    }
  });
};
