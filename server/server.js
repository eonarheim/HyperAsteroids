/// server file to coordinate clients
// server globals

// game size
var maxX = 1000;
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

// enum of actions sent to client
var Client = {};
Client.start = "start"; //data: {id: somenumber, x:,somenumber y:somenumber}
Client.player = "player"; // data: {id: somenumber, x: somenumber, y: sumnumber}
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

var Bullet = function(dir, pos){
	var self = {};
	self.id = newId();
	self.pos = pos;
	self.dir = dir;
	self.vel = .9;
	self.life = 20;
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
	self.health = 100;
	self.socket = socket;
	self.pos = new Pos(100,100);
	self.dir = new Dir(1.0,0.0);
	self.dy = 0;
	self.dx = 0;
	self.rotation = 0; // in radians
	self.bullets = [];
	self.deadBullets = [];
	self.canFire = true;
	self.lastFire;
	self.sinceLastFire;
	self.fireBullet = function(){
		if(self.canFire){
			var newBullet = new Bullet(new Dir(self.dir.dx, self.dir.dy), new Pos(self.pos.x, self.pos.y));
			//console.log("Creating new bullet: " + newBullet.id);
			self.bullets.push(newBullet);
			self.lastFire = new Date().getTime();
			self.sinceLastFire = self.lastFire;
			self.canFire = false;
		}else{
			console.log("Cant fire yet");
		}
	}

	self.move = function() {
		// Appy impulse
		self.dx += self.dir.dx/10;
		self.dy += self.dir.dy/10;

	}

	self.update = function(timeElapsed) {
		// get dead bullets
		self.deadBullets = self.bullets.filter(function(bullet){
			return bullet.life <= 0;
		});


		// cull dead bullets
		self.bullets = self.bullets.filter(function(bullet){
			return bullet.life > 0;
		});

		// update live bullets
		for(var b in self.bullets){
			
			self.bullets[b].update(timeElapsed);			
		}

		self.dx = clamp(self.dx,-1,1);
		self.dy = clamp(self.dy,-1,1);

		self.pos.x += self.dx*timeElapsed;
		self.pos.y += self.dy*timeElapsed;


		self.pos.x %= maxX;
		self.pos.y %= maxY;

		if(self.pos.x<0){
			self.pos.x = maxX;
		}

		if(self.pos.y<0){
			self.pos.y = maxY;
		}
		self.sinceLastFire += timeElapsed;
		// Fire only every 600ms
		if(self.sinceLastFire - self.lastFire > 600){
			self.canFire = true;
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

		for(var id in players){
			players[id].update(elapsed);
			
		}
		var allBullets = [];
		var deadBullets = [];
		for(var id in players){
			var p = players[id];

			allBullets = allBullets.concat(p.bullets);
			deadBullets = deadBullets.concat(p.deadBullets);
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

		
		for(var id in players){
			var p = players[id];
			for(var b in allBullets){
				var tmp = allBullets[b];
				p.socket.emit(Client.bullet, 
				{
					id: tmp.id,
					x: tmp.pos.x,
					y: tmp.pos.y
				});
			}
			for(var b in deadBullets){
				var tmp = deadBullets[b];
				//console.log("Emitting dead bullet: " + tmp.id);
				p.socket.emit(Client.bullet, 
				{
					id: tmp.id,
					dead: true
				});
			}
		}

		// update time of last loop ending
		lastTime = now;

	}, 40);


});






