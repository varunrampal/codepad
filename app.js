var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Sandbox = require("./lib/sandbox");
var s = new Sandbox();

app.use(express.static(__dirname + '/'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/coderpad.html');
});

function SessionsWithUsers(sessionid, user) {
  this.sessionid = sessionid;
  this.users = [];
  this.sourcecode = '';
}

SessionsWithUsers.prototype.addUser = function(user) {
    this.users.push(user);
};

SessionsWithUsers.prototype.setSourceCode = function(sourcecode) {
    this.sourcecode = sourcecode;
};

var sessionswithusers = [];

io.on('connection', function (socket) {

  console.log('A user connected');

  socket.on('setUsername', function (data) {  
   
    if (sessionswithusers.filter(e => e.sessionid == data.sessionid && e.users.filter(u => u.indexOf(data.username) > -1)) > 0) {
       socket.emit('userExists', data.username + ' already joined session ' + data.sessionid+ ' please enter different user name');
       console.log('You have already joined this session');
    }
    else {

      if(sessionswithusers.filter(e => e.sessionid == data.sessionid).length > 0) {
        var existingSession = sessionswithusers.filter(e => e.sessionid == data.sessionid)[0];
        existingSession.addUser(data.username);        
        console.log(sessionswithusers);      
        socket.emit('userSet', { sourcecode: existingSession.sourcecode, username:data.username });
        
        //io.sockets.emit('joineduserset', { sessionjoinees: existingSession.users });
        //Send this event to everyone in the room.
        io.sockets.in(data.sessionid).emit('joineduserset', { sessionjoinees: existingSession.users });        
       // socket.broadcast.to(data.sessionid).emit('joineduserset', { sessionjoinees: existingSession.users });
      } else {
        var newSession = (new SessionsWithUsers(data.sessionid));
        newSession.addUser(data.username);
        sessionswithusers.push(newSession);
        //socket.emit('userSet', { username: data.username, sessionjoinees: newSession.users });
         socket.emit('userSet', { sourcecode: newSession.sourcecode, username:data.username});
         io.sockets.in(data.sessionid).emit('joineduserset', { sessionjoinees: newSession.users }); 
      }
    }

    // if (users.indexOf(data) > -1) 
    //   {
    //      socket.emit('userExists', data + ' name is taken! Try some other name.');
    //   }
    // else 
    //   {
    //      users.push(data);
    //      socket.emit('userSet', { username: data });
    //   }
  });
  socket.on('msg', function (data) {

    s.run(data.message, function (output) {
      console.log("compiled: " + output.result + "\n" + data.user);

      //Send message to everyone
     // io.sockets.emit('newmsg', { outputmessage: output.result, sentbyuser: data.user });
     io.sockets.in(data.sessionid).emit('newmsg', { outputmessage: output.result, sentbyuser: data.user });

    })

  });

  socket.on('usercode', function (data) {
    //Send message to everyone in the room
    //io.sockets.in(data.sessionid).emit('usercodechanged', data);

    if(sessionswithusers.filter(e => e.sessionid == data.sessionid).length > 0) {
      var session = sessionswithusers.filter(e => e.sessionid == data.sessionid)[0];
      session.setSourceCode(data.code);
    }
    socket.broadcast.to(data.sessionid).emit('usercodechanged', data);
    ////Send message to everyone
    //io.sockets.emit('usercodechanged', data);
  })

  socket.on('createnewsession', function (data) {

    if(sessionswithusers.filter(u => u.sessionid == data).length > 0) {
      socket.emit('sessionalreadyrunnig', { message: 'Session with id : ' + data + ' is already running' });
    } else {
      socket.join(data);
      console.log(data);
      //Send this event to everyone in the room.
      //io.sockets.in(data).emit('connectToRoom', data);
      socket.emit('connectToRoom', data);
    }
    
  });

  socket.on('joinexistingsession', function (data) {

    if(sessionswithusers.filter(u => u.sessionid == data).length == 0) {
      socket.emit('sessionnotrunning', { message: 'Session with id : ' + data + ' is not running' });
    } else {
      socket.join(data);
      console.log(data);
      //Send this event to everyone in the room.
     // io.sockets.in(data).emit('connectToRoom', data);
       socket.emit('connectToRoom', data);
    }
    
  });

  socket.on('disconnect', function () {
    console.log('A user disconnected');
  });
});

http.listen(3000, function () {
  console.log('listening on localhost:3000');
});