var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var randomcolor = require('randomcolor');

app.get('/', function(req, res) {
    res.sendFile('index.html', {"root": __dirname});
});
app.get('/client', function(req, res) {
    res.sendFile('client.html', {"root": __dirname});
});

var objects = {};

io.on('connection', function(socket) {
    console.log('a user connected');
    for (id in objects) {
        socket.emit('add', objects[id]);
    }
    var id = socket.id;
    var color = randomcolor({
        luminosity: 'bright'
    });
    objects[id] = {
        id: id,
        color: color
    }
    var o = objects[id];
    console.log(o.color);
    socket.broadcast.emit('add', {
        id: id,
        color: o.color
    });
    socket.on('disconnect', function() {
        console.log('user disconnected');
        io.emit('remove', {id: id});
        delete objects[id];
    });
    socket.on('ping', function(msg) {
        console.log('ping');
        socket.emit('pong', {
            color: color
        });
    });
    socket.on('move', function(msg) {
        msg.id = id;
        socket.broadcast.emit('move', msg);
    });
    socket.on('place', function(msg) {
        console.log('place');
        var oid = guid();
        objects[oid] =  {
            id: oid,
            color: color,
            position: msg.position
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
