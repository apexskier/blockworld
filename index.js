var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile('index.html', {"root": __dirname});
});
app.get('/client', function(req, res) {
    res.sendFile('client.html', {"root": __dirname});
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
    socket.on('ping', function() {
        console.log('ping');
        io.emit('pong');
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
