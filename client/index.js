var io = require('socket.io-client');
var socket = io(window.location.hostname + ':8080');

// Get a regular interval for drawing to the screen
window.requestAnimFrame = (function (callback) {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimaitonFrame ||
  function (callback) {
    window.setTimeout(callback, 1000/60);
  };
})();

socket.on('config', function(plotterConfig) {
  var lines = [];
  var line = [];

  var log = window.document.getElementById('log');
  var canvas = window.document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var position = {x: 0, y: 0};
  var p_position = {x: 0, y: 0};
  var pen_down = false;

  var history = {
    // https://codepen.io/abidibo/pen/rmGBc

    undoBtn: document.getElementById('undo'),
    redoBtn: document.getElementById('redo'),
    redo_list: [],
    undo_list: [],
    clear: function() {
      this.undoBtn.classList.add('disabled');
      this.redoBtn.classList.add('disabled');
      this.redo_list = [];
      this.undo_list = [];
    },

    saveState: function(canvas, list, keep_redo) {
      keep_redo = keep_redo || false;
      if(!keep_redo) {
        this.redo_list = [];
      }

      (list || this.undo_list).push({
        data: canvas.toDataURL(),
        lines: [...lines],
      });

      if (this.undo_list.length > 0) this.undoBtn.classList.remove('disabled');
      if (this.redo_list.length > 0) this.redoBtn.classList.remove('disabled');

    },
    undo: function(canvas, ctx) {
      this.restoreState(canvas, ctx, this.undo_list, this.redo_list);
    },
    redo: function(canvas, ctx) {
      this.restoreState(canvas, ctx, this.redo_list, this.undo_list);
    },
    restoreState: function(canvas, ctx,  pop, push) {
      if(pop.length) {
        this.saveState(canvas, push, true);
        var restore_state = pop.pop();
        var img = new Image();
        img.src = restore_state.data;
        lines = restore_state.lines;
        img.onload = function() {
          ctx.clearRect(0, 0, 600, 400);
          ctx.drawImage(img, 0, 0, 600, 400, 0, 0, 600, 400);
        }
      }
      if(this.undo_list.length === 0) this.undoBtn.classList.add('disabled');
      if(this.redo_list.length === 0) this.redoBtn.classList.add('disabled');
    }
  }

  canvas.width = plotterConfig.height;
  canvas.height = plotterConfig.width;

  var scale;
  function resize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    scale = (width > height) ? height / window.document.getElementById('canvasWrapper').offsetHeight : (width - 30) / canvas.width;

    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
  }

  resize();

  window.addEventListener('resize', function() {
    clearTimeout(window.endResize);
    window.endResize = setTimeout(resize, 100);
  });

  (function enable() {
    document.getElementById('canvas').classList.remove('disabled');
    document.getElementById('clear').classList.remove('disabled');
    document.getElementById('send').classList.remove('disabled');
  })();

  // -----------------------------------------

  canvas.addEventListener('mousedown', beginDraw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', beginTouchDraw);
  canvas.addEventListener('touchend', endDraw);

  canvas.addEventListener('mousemove', function(e) {
    position.x = e.offsetX / scale;
    position.y = e.offsetY / scale;
  });

  canvas.addEventListener('touchmove', function(e) {
    var finger = getTouchPos(e);
    position.x = finger.x / scale;
    position.y = finger.y / scale;
  });

  function beginDraw(e) {
    history.saveState(canvas);
    history.redo_list = [];
    history.redoBtn.classList.add('disabled');
    pen_down = true;
    position.x = p_position.x = e.offsetX / scale;
    position.y = p_position.y = e.offsetY / scale;
  }

  function beginTouchDraw(e) {
    history.saveState(canvas);
    history.redo_list = [];
    history.redoBtn.classList.add('disabled');
    var finger = getTouchPos(e);
    position.x = p_position.x = finger.x / scale;
    position.y = p_position.y = finger.y / scale;
    pen_down = true;
  }

  function endDraw() {
   pen_down = false;
   lines.push(line);
   line = [];
 }

 function getTouchPos(touchEvent) {
  var rect = canvas.getBoundingClientRect();
  if (touchEvent.target == canvas) touchEvent.preventDefault();
  return {
    x: touchEvent.touches[0].clientX - rect.left,
    y: touchEvent.touches[0].clientY - rect.top
  };
}

  // -----------------------------------------

  window.document.getElementById('send').addEventListener('click', function() {
    log.innerHTML = 'Drawing...';
    socket.emit('draw', lines);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lines = [];
    history.clear();
  });

  window.document.getElementById('clear').addEventListener('click', function() {
    clear();
  });

  window.document.getElementById('undo').addEventListener('click', function() {
    history.undo(canvas, ctx);
  });

  window.document.getElementById('redo').addEventListener('click', function() {
    history.redo(canvas, ctx);
  });


  // -----------------------------------------

  (function drawLoop () {
    requestAnimFrame(drawLoop);
    renderCanvas();
  })();

  function renderCanvas() {
    if (pen_down) drawLine(position.x, position.y, p_position.x, p_position.y);
    p_position.x = position.x;
    p_position.y = position.y;
  }

  function drawLine(fromx, fromy, tox, toy){
    if (line.length === 0) line.push([fromy, fromx]);
    line.push([toy, tox]);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
  }

  function clear() {
    lines = [];
    history.saveState(canvas);
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }


  socket.on('log', function(message) {
    console.log(message);
    log.innerHTML = message;
  });

});