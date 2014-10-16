var port = 3000;

var app = require('express')();
var serveStatic = require('serve-static');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var randomcolor = require('randomcolor');
var moment = require('moment');
var THREE = require('three');
var _ = require('underscore');

app.use(serveStatic(__dirname + '/static'));
app.use(serveStatic(__dirname + '/node_modules'));

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
        type: "cube",
        position: {
            x: 0, y: 0, z: 0
        }
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
        o.position = msg.position;
    });
    socket.on('place', function(msg) {
        var oid = guid();
        var testVec = new THREE.Vector3(msg.position.x, msg.position.y, msg.position.z);
        console.log(testVec.length());
        if (Math.abs(testVec.length()) < 10) {
            return; // can't place blocks in middle.
        }
        var tooClose = false;
        _.each(objects, function(obj, k) {
            if (!tooClose) {
                switch (obj.type) {
                    case "cube":
                        var testVec2 = new THREE.Vector3();
                        testVec2.copy(obj.position);
                        if (Math.abs(testVec2.sub(testVec).length()) < 0.3) {
                            tooClose = true;
                        }
                    default:
                        ;
                }
            }
        });
        if (tooClose) {
            return;
        }
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

http.listen(port, function() {
    console.log('listening on *:' + port);
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
