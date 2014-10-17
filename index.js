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

/*
func[cntr_, rad_, n_, ang0_] :=
 Graphics[{Circle[cntr, rad], {Red, PointSize@0.02,
     Point[Table[rad{Cos [ang0 + j],Sin[ang0 + j]}, {j, 0,
            2 Pi - 2 Pi/n, 2 Pi/n}]]}}]
*/

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

function circlePoints(center, rad, n, angle) {
    for (var j = 0; j <= 2*Math.PI - 2*Math.PI/n; j += 2*Math.PI/n) {
        var id = guid();
        objects[id] = {
            id: id,
            position: {
                x: rad * Math.cos(angle + j),
                y: rad * Math.sin(angle + j),
                z: 0
            }
        }
    }
}
//circlePoints(0, 10, 8, 0);

function spherePoints(n, rad) {
    var dlng = Math.PI * (3 - Math.sqrt(5));
    var dz = 2.0 / n;
    var lng = 0;
    var z = 1 - dz/2;
    for (var k = 0; k < n; k++) {
        var r = Math.sqrt(1 - z * z);
        var id = guid();
        objects[id] = {
            id: id,
            size: 0.2,
            position: {
                x: rad * Math.cos(lng) * r,
                y: rad * Math.sin(lng) * r,
                z: rad * z
            }
        }
        z = z - dz;
        lng = lng + dlng;
    }
}
spherePoints(32, 10);

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
            type: "cube",
            placed: new Date(),
            creator: id
        }
        io.emit('add', objects[oid]);
    });
    socket.on('remove', function(msg) {
        // TODO: authentication/permission
        if (objects.hasOwnProperty(msg.id)) {
            delete objects[msg.id]
            io.emit('remove', msg);
        }
    });
    socket.on('query', function(msg) {
        io.emit('info', objects[msg.id]);
    });
});

http.listen(port, function() {
    console.log('listening on *:' + port);
});
