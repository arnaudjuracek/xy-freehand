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
    canvas.classList.remove('disabled');
    var inputs = document.getElementsByTagName('button');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = false;
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
    pen_down = true;
    position.x = p_position.x = e.offsetX / scale;
    position.y = p_position.y = e.offsetY / scale;
  }

  function beginTouchDraw(e) {
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
  });

  window.document.getElementById('clear').addEventListener('click', function() {
    clear();
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
    if (line.length === 0) line.push([fromy, canvas.width - fromx]);
    line.push([toy, canvas.width - tox]);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();
  }

  function clear() {
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines = [];
  }


  socket.on('log', function(message) {
    console.log(message);
    log.innerHTML = message;
  });

});