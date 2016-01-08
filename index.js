// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;
var online = [];
var users = {};
var pairs= {};

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
      var msg = data.trim();
      if(pairs[socket.username]){
			
					users[pairs[socket.username]].emit('whisper', {username: socket.username, message: msg,});
					console.log('message sent is: ' + msg);
      }
      else{
        socket.broadcast.emit('new message', {
          username: socket.username,
          message: data
        });
       }
  });
    
    
  socket.on('private', function (data, callback) {
        
        var name = data.trim();
		console.log(name);
        if(name in users){
            console.log('the entered user is online ' + name);
            
            
            // need to send request box to other user, if accepted then open up chat, else go back to lobby and alert user that request was denied
            users[name].emit('request', {username: socket.username}, function(data){
                if(data){
                    console.log('The user accepted.');
                    // create link between both users
                    pairs[socket.username] = name;
                    pairs[name] = socket.username;
                    callback(true);
                }
                else{
                    console.log('The user rejected.');
                    callback(false);
                }
            });
            
        } else{
            console.log('the entered user is not online ' + data);
            callback(false);
        }
  });
    
    
    
  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    online.push(username);
    users[socket.username] = socket;
    //console.log(users);
    ++numUsers;
    addedUser = true;
    
    io.sockets.emit('online', {
      online: online
    });  
      
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });
    
  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
      online.splice(online.indexOf(socket.username), 1);
      delete users[socket.username];
      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
        
      socket.broadcast.emit('online', {
      online: online
      });  
    }
  });
});
