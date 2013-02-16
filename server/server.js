/// server file to coordinate clients
// server globals

// game size
var maxX = 1000;
var maxY = 800;

// all players connected at one time!!!
var players = {};

// all bullets present at one time
var bullets = [];


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


var clamp = function(val, min, max){
	if(val<min){
		return min;
	}else if(val>max){
		return max;
	}else{
		return val;
	}
}

// enum of possible actions the server can recieve from the client
var Server = {};
Server.move = "move"; // data : {id: somenumber, forward: true|false, rotation: radians}
Server.fire = "fire"; // data :  {id: somenumber, rotation: radians}
Server.info = "info"; // data : {id: , name:}

// enum of actions sent to client
var Client = {};
Client.start = "start"; //data: {id: somenumber, x:,somenumber y:somenumber}
Client.player = "player"; // data: {id: somenumber, name: name, x: somenumber, y: sumnumber}
Client.bullet = "bullet"; // data: {id:, x: somenumber, y: somenubmer} | "{id: ,dead: true}"
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

var Bullet = function(dir, pos, ownerId){
	var self = {};
	self.id = newId();
	self.pos = pos;
	self.dir = dir;
	self.vel = .4;
	self.life = 100;
	self.update = function(timeElapsed) {
		self.life--;
		self.pos.add(self.dir, self.vel*timeElapsed);

		self.pos.x %= maxX;
		self.pos.y %= maxY;

		if(self.pos.x<0){
			self.pos.x = maxX;
		}

		if(self.pos.y<0){
			self.pos.y = maxY;
		}

	}
	return self;
}

var Player = function(id, socket){
	var self = {};
	self.id = id;
	self.name = "";
	self.health = 100;
	self.socket = socket;
	self.pos = new Pos(100,100);
	self.dir = new Dir(1.0,0.0);
	self.dy = 0;
	self.dx = 0;
	self.rotation = 0; // in radians
	//self.bullets = [];
	self.deadBullets = [];
	self.canFire = true;
	self.lastFire;
	self.sinceLastFire;
	self.canMove = true;
	self.lastMove;
	self.sinceLastMove;
	self.fireBullet = function(){
		if(self.canFire){
			var newBullet = new Bullet(new Dir(self.dir.dx, self.dir.dy), new Pos(self.pos.x, self.pos.y), self.id);
			//console.log("Creating new bullet: " + newBullet.id);
			bullets.push(newBullet);
			self.lastFire = new Date().getTime();
			self.sinceLastFire = self.lastFire;
			self.canFire = false;
		}else{
			//console.log("Cant fire yet");
		}
	}

	self.move = function() {

		if(self.canMove){
			// Appy impulse
			self.dx += self.dir.dx/40;
			self.dy += self.dir.dy/40;
			self.lastMove = new Date().getTime();
			self.sinceLastMove = self.lastMove;
			self.canMove = false;
		}else{
			//console.log("Can't move yet");
		}

	}

	self.update = function(timeElapsed) {

		self.dx = clamp(self.dx,-.5,.5);
		self.dy = clamp(self.dy,-.5,.5);
		//console.log("New Vel: " + (self.dx*timeElapsed).toFixed(1) + ", " + (self.dy*timeElapsed).toFixed(1));
		self.pos.x += clamp(self.dx*timeElapsed, -15, 15);
		self.pos.y += clamp(self.dy*timeElapsed, -15, 15);


		self.pos.x %= maxX;
		self.pos.y %= maxY;

		if(self.pos.x<0){
			self.pos.x = maxX;
		}

		if(self.pos.y<0){
			self.pos.y = maxY;
		}

		// Throttle moves and fires
		self.sinceLastMove += timeElapsed;
		self.sinceLastFire += timeElapsed;

		// Fire only every 300ms
		if(self.sinceLastFire - self.lastFire > 300){
			self.canFire = true;
		}

		// Move only every 70ms
		if(self.sinceLastMove - self.lastMove > 100){
			self.canMove = true;
		}
		
		
	}

	return self;
}





// asteroids server 
var io = require('socket.io').listen(8080, {log: false});

io.sockets.on('connection', function (socket) {
  var newplayerId = newId();
  var newplayer = new Player(newplayerId, socket);
  players[newplayerId] = newplayer;

  // Setup new player
  console.log("[INFO]: New player connected - id: " + newplayerId );
  socket.emit(Client.start, 
  		{
  			id: newplayerId,
  			x: newplayer.pos.x,
  			y: newplayer.pos.y
  		});
  socket.on(Server.info, function(data){
  		players[data.id].name = data.name;
  		console.log("[INFO]: Player has chosen the name: " + data.name);
  });


  // register update
  socket.on(Server.move, function(data){
  		var player = players[data.id];
  		if(player){
  			if(data.rotation !== 0.0){
		  		player.dir.rotateBy(data.rotation);
	  		}
	  		if(data.forward){
	  			//console.log("Player " + player.id + " has issued a move command");
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
  				delete players[id];
  				break;
  			}

  		}
      console.log("[INFO]: Client disconnected! Players left: " + players.length);

  });

  
  // Mainloop code executes every 30 ms and emits postion information to players

	var lastTime = new Date().getTime();
	setInterval(function(){
		// Get the time to calculate time-elapsed
		var now = new Date().getTime();
		var elapsed = now - lastTime;
		//console.log("Elapsed time: " + elapsed);

		// Update Players
		for(var id in players){
			players[id].update(elapsed);
		}

		// Update Bulllets
		for(var id in bullets){
			var b = bullets[id];
			b.update(elapsed);
		}
		
		// Broadcast all player positions
		for(var id in players){
			var p = players[id];

			for(var j in players){
				var tmp = players[j];
				p.socket.emit(Client.player, 
				{
					id: tmp.id,
					name: tmp.name,
					x: tmp.pos.x,
					y: tmp.pos.y,
					angle: tmp.dir.angle
				});
			}
		}

		// Broadcast all bullet positions
		for(var id in players){
			var p = players[id];
			for(var bid in bullets){
				var b = bullets[bid];
				if(b.life > 0){
					p.socket.emit(Client.bullet, 
					{
						id: b.id,
						x: b.pos.x,
						y: b.pos.y
					});
				}else{
					p.socket.emit(Client.bullet, 
					{
						id: b.id,
						dead: true
					});
				}

			}
		}

		// update time of last loop ending
		lastTime = now;

	}, 20);


});






