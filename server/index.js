const os      = require('os');
const path    = require('path');
const sh      = require('kool-shell');
const express = require('express');
const app     = express();
const server  = require('http').Server(app);
const io      = require('socket.io')(server);

const plotter = require('xy-plotter')();
const file = plotter.File();
const serial = plotter.Serial('/dev/tty.wchusbserial1410', {
  // disconnectOnJobEnd: false,
  verbose: true,
  progressBar: false,
});

const port = 8080;

app.use(express.static(path.join(__dirname, '..', 'client')));
server.listen(port, function(){
  var interfaces = os.networkInterfaces();
  var addresses = [];
  for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
      var address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }

  sh.success(`http://${addresses[0]}:${port}`);
});


io.on('connection', (socket) => {
  const id = socket.id;

  socket.emit('config', plotter.config);
  socket.emit('log', 'Connected to the server.');


  socket.on('draw', (lines) => {
    let job = plotter.Job(id);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.length > 0) {
        job
        .pen_up()
        .move(line[0][0], line[0][1])
        .pen_down();
        for (let j = 1; j < line.length; j++) {
          job.move(line[j][0], line[j][1]);
        }
      }
    }

    serial.send(job)
    .then(() => socket.emit('log', 'Job done !'))
    .catch((err) => {
      file.export(job, path.join(__dirname, 'jobs', `${id}.png`));
      socket.emit('log', 'An error occured while sending job.');
    });

  });
});