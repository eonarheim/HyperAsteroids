/// server file to coordinate clients
// server globals

// game size
var maxX = 1000;
var maxY = 800;

// all players connected at one time!!!
var players = {};
var playersArray = [];

// all bullets present at one time
var bullets = [];


var id = 0;


/// Utility functions

var newId = function(){
	return id++;
}

var distance = function(pos1, pos2){
	return Math.sqrt(Math.pow(pos1.x-pos2.x,2) + Math.pow(pos1.y-pos2.y,2));
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
	self.dead = false;
	self.vel = .4;
	self.life = 100;
	self.ownerId = ownerId;
	self.update = function(timeElapsed) {
		self.life--;
		if(self.life <= 0){
			self.dead = true;
		}
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
	var self = this;
	self.id = id;
	self.name = "Unknown";
	self.health = 100;
	self.socket = socket;
	self.pos = randomPos(maxX,maxY);//new Pos(100,100);
	self.dir = new Dir(1.0,0.0);
	self.dy = 0;
	self.dx = 0;
	self.rotation = 0; // in radians
	self.deadBullets = [];
	self.canFire = true;
	self.lastFire;
	self.sinceLastFire;
	self.canMove = true;
	self.lastMove;
	self.sinceLastMove;
	self.fireBullet = function(){
		if(self.canFire){
			//console.log("Firing bullet with ownder id " + self.id);
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
		if(timeElapsed < 15){
			return;
		}
		self.dx = clamp(self.dx,-.5,.5);
		self.dy = clamp(self.dy,-.5,.5);
		//console.log("New Vel: " + (self.dx*timeElapsed).toFixed(1) + ", " + (self.dy*timeElapsed).toFixed(1));
		self.pos.x += clamp(self.dx*timeElapsed, -10, 10);
		self.pos.y += clamp(self.dy*timeElapsed, -10, 10);


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

		// Check for bullet collisions
		for(var id in bullets){
			var b = bullets[id];
			if(b.ownerId == self.id || b.dead){
				continue;
			}

			if(distance(b.pos, self.pos) < 12){
				self.health -= 10;
				//console.log(JSON.stringify(b)+":"+JSON.stringify(self.pos));
				//console.log("Player " + self.name + " is hit by " + players[b.ownerId].name + " by " + distance(b.pos, self.pos));
				b.dead = true;
				break;
			}
		}
		
		
	}

	return self;
}





// asteroids server 
var io = require('socket.io').listen(8080, {log: false});


var started = false;
io.sockets.on('connection', function (socket) {
  var newplayerId = newId();
  var newplayer = new Player(newplayerId, socket);
  players[newplayerId] = newplayer;
  playersArray.push(newplayer);

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
  			// remove players when they disconnect
  			if(player.socket == socket){
      		console.log("[INFO]: Client disconnected! Players : " + player.name + " ("+player.id+")");
      		player.health = -100;
  				playersArray.splice(id,1);
  				console.log("[INFO]: Players left: " + playersArray.length);
  				delete players[id];
  				break;
  			}
  			
  		}

  });

  
  // Mainloop code executes every 30 ms and emits postion information to players

  if(!started){
  		started = true;
		var lastTime = new Date().getTime();
		setInterval(function(){
			// Get the time to calculate time-elapsed
			var now = new Date().getTime();
			var elapsed = Math.floor((now - lastTime));
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
			playersArray = playersArray.filter(function(player){
				return player.health > -1;
			});
			var dlPackage = playersArray.map(function(player){
					return {
						id: player.id,
						name: player.name,
						health: player.health,
						x: player.pos.x,
						y: player.pos.y,
						angle: player.dir.angle
					};
				});
			
			var dlBullets = bullets.map(function(bullet){
				return {
					id: bullet.id,
					dead: bullet.dead,
					x: bullet.pos.x,
					y: bullet.pos.y
				};
			});
			// Broadcast all player positions
			for(var id in players){
				var p = players[id];
				p.socket.emit(Client.player, dlPackage);
			}

			// Broadcast all bullet positions
			for(var id in players){
				var p = players[id];
				p.socket.emit(Client.bullet, dlBullets);
			}

			// Remove dead bullets
			for (var id in bullets){
				var b = bullets[id];
				if(b.dead){
					bullets.splice(id,1);
				}
			}
			// Remove dead players
			for( var id in playersArray){
				var p = playersArray[id];
				if(p.health < 0){
					playersArray.splice(id, 1);
					delete players[id];
				}
			}

			// update time of last loop ending
			lastTime = now;

		}, 35);

	}

});






