/// server file to coordinate clients
// server globals

// game size
var maxX = 800;
var maxY = 800;

// all players connected at one time!!!
var players = {};

var id = 0;


/// Utility functions

var newId = function(){
	return id++;
}

/// Broadcast to all except me
var broadcast = function(type, me, data){
	for(var i = 0; i < players.length; i++) {
         var s = players[i];
         if(s == me) {
             continue;
         }
         s.emit(type, data);
     }
}

// Generate a random position
var randomPos = function(maxX, maxY){
	return new Pos(Math.random() * maxX, Math.random() * maxY);
}


// enum of possible actions the server can recieve from the client
var Server = {};
Server.move = "move"; // data : {id: somenumber, forward: true|false, rotation: radians}
Server.fire = "fire"; // data :  {id: somenumber, rotation: radians}

// enum of actions sent to client
var Client = {};
Client.start = "start"; //data: {id: somenumber, x:,somenumber y:somenumber}
Client.player = "player"; // data: {id: somenumber, x: somenumber, y: sumnumber}
Client.bullet = "bullet"; // data: {x: somenumber, y: somenubmer}
Client.dead = "dead"; //data: {id: somenumber}


// objects
var Dir = function(dx,dy){
	var self = {};
	self.dx = dx;
	self.dy = dy;
	self.angle = 0.0;
	// angle in radians
	self.rotateBy = function(angle){
		var mag = Math.sqrt(self.dx*self.dx + self.dy * self.dy);
		self.angle += angle;
		self.dx = mag * Math.cos(self.angle);
		self.dy = mag * Math.sin(self.angle);
	}

	return self;
}

var Pos = function(x,y){
	var self = {};
	self.x = x;
	self.y = y;
	self.add = function(dir, scale){
		self.x += dir.dx*scale;
		self.y += dir.dy*scale;
	}
	return self;
}

var Bullet = function(dir, pos){
	var self = {};
	self.pos = pos;
	self.dir = dir;
	self.vel = 20;
	var life = 300;
	self.update = function() {
		life--;
		self.pos.add(self.dir, self.vel);
	}
}

var Player = function(id, socket){
	var self = {};
	self.id = id;
	self.health = 100;
	self.socket = socket;
	self.pos = new Pos(100,100);
	self.dir = new Dir(1.0,0.0);
	self.vel = 10;
	self.rotation = 0; // in radians
	self.bullets = [];
	self.fireBullet = function(){
		self.bullets.push(new Bullet(self.dir, self.pos));
	}

	self.move = function() {
		// Update self position
		self.pos.add(self.dir, self.vel);
	}

	self.update = function() {
		// cull dead bullets
		self.bullets = self.bullets.filter(function(bullet){
			return bullet.life > 0;
		});

		// update live bullets
		for(var i = 0; i< self.bullets.length; i++){
			self.bullets[i].update();			
		}

		
	}

	return self;
}





// asteroids server 
var io = require('socket.io').listen(8080);

io.sockets.on('connection', function (socket) {
  var newplayerId = newId();
  var newplayer = new Player(newplayerId, socket);
  players[newplayerId] = newplayer;
  console.log("[INFO]: New player connected - id: " + newplayerId );
  socket.emit(Client.start, 
  		{
  			id: newplayerId,
  			x: newplayer.pos.x,
  			y: newplayer.pos.y
  		});

  // register update
  socket.on(Server.move, function(data){
  		var player = players[data.id];
  		if(player){
  			if(data.rotation !== 0.0){
		  		player.dir.rotateBy(data.rotation);
	  		}
	  		if(data.forward){
	  			player.move();
	  		}
  		}

  });

  // regiser fire actions
  socket.on(Server.fire, function(data){
  		var player = players[data.id];
  		if(player){
  			player.fireBullet();
  		}
  });


  // clean up socket after disconnect
  socket.on('disconnect', function () {
  		
  		for(var id in players){
  			var player =  players[id];
  			if(player.socket === socket){
  				players[id] = 'disconnected';
  				break;
  			}

  		}

      console.log("[INFO]: Client disconnected!");
  });

  // Mainloop code executes every 30 ms and emits postion information to players
	setInterval(function(){
		for(var id in players){
			if(players[id] === 'disconnected'){
				continue;
			}
			players[id].update();
			
		}

		for(var id in players){
			if(players[id] === 'disconnected'){
				continue;
			}
			var p = players[id];
			for(var j in players){
				var tmp = players[j];
				p.socket.emit(Client.player, 
				{
					id: tmp.id,
					x: tmp.pos.x,
					y: tmp.pos.y,
					angle: tmp.dir.angle

				});
			}
		}


	}, 20);


});






