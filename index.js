var app = require('express')();
var serveStatic = require('serve-static');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var randomcolor = require('randomcolor');
var moment = require('moment');

app.use(serveStatic(__dirname + '/static'));

app.get('/', function(req, res) {
    res.sendFile('index.html', {"root": __dirname});
});

var objects = {
    type: "collection"
};

io.on('connection', function(socket) {
    socket.emit('add', objects);
    var id = socket.id;
    var color = randomcolor({
        luminosity: 'bright'
    });
    objects[id] = {
        id: id,
        color: color,
        type: "cube"
    }
    var o = objects[id];
    console.log('[' + moment().format() + '] ' + socket.handshake.address + ' client ' + id + ' connected: ' + o.color);
    socket.broadcast.emit('add', {
        id: id,
        color: o.color
    });
    socket.on('disconnect', function() {
        console.log('[' + moment().format() +'] client ' + id + ' disconnected: ' + o.color);
        io.emit('remove', {id: id});
        delete objects[id];
    });
    socket.on('ping', function(msg) {
        socket.emit('pong', {
            color: color
        });
    });
    socket.on('move', function(msg) {
        msg.id = id;
        socket.broadcast.emit('move', msg);
    });
    socket.on('place', function(msg) {
        var oid = guid();
        objects[oid] =  {
            id: oid,
            color: color,
            position: msg.position,
            size: 0.5,
            type: "cube"
        }
        io.emit('add', objects[oid]);
    })
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

var guid = (function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();
