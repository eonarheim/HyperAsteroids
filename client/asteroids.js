/// Client model

// enum of possible actions the server can recieve from the client
var Server = {};
Server.move = "move"; // data : {id: somenumber, forward: true|false, rotation: radians}
Server.fire = "fire"; // data :  {id: somenumber, rotation: radians}
Server.info = "info"; // data : {id: , name:}

// enum of actions sent to client
var Client = {};
Client.start = "start"; //data: {id: somenumber}
Client.player = "player"; // data: {id: somenumber, x: somenumber, y: sumnumber}
Client.bullet = "bullet"; // data: {x: somenumber, y: somenubmer}
Client.dead = "dead"; //data: {id: somenumber}



var Game = function(playerName) {

	var self = this;
	self.name = playerName;
 	self.players = {};
 	self.playersArray = [];
 	self.bullets = {};
 	self.id = 0;
 	self.x = 0;
 	self.y = 0;
 	self.angle = 0.0;
 	self.dead = false;

  self.canvas = document.getElementById("game");
  document.body.style.margin = "0";
  self.canvas.width = "1000";
  self.canvas.height = "800";

  self.ctx = self.canvas.getContext("2d");
  self.ctx.font = "20px Consolas";

	var socket = io.connect('http://127.0.0.1', {
    	reconnect: false
	});

	socket.on('connect',function(){
		$('#game').empty();
	});

  socket.on('error', function(){
    self.dead = true;
    
    $('#serverdown').show();

  });


	socket.on(Client.start, function(data){
		self.id = data.id;
		self.x = data.x;
		self.y = data.y;
		self.players[data.id] = data;
		// Respond with name
		socket.emit(Server.info, {id: self.id, name: self.name})
	});

	socket.on(Client.player, function (data) {
		$.each(data, function(i, player){
			if(player.id == self.id){
				if(player.health <= 0){
  				$('#loseModal').show();
  				self.dead = true;
  				socket.disconnect();
				}
			}
			self.players[player.id] = player;

		});
		self.playersArray = data;
	});

	socket.on(Client.bullet, function (data){
		$.each(data, function(i, bullet){
			self.bullets[bullet.id] = bullet;
		});
	});


	self.move = function(move, angle){
		if(self.dead) return;
		socket.emit(Server.move, 
			{
				id: self.id,
				forward: move,
				rotation: angle 
			});
	}

	self.fire = function(angle) {
		if(self.dead) return;
		socket.emit(Server.fire, 
			{
			id: self.id,
				rotation: angle 
			});
	}

  self.drawShip = function(id, angle, x, y, color){
    self.ctx.save();
    self.ctx.translate(x,y);
    self.ctx.save();
    self.ctx.rotate(angle);

    self.ctx.beginPath();
    self.ctx.lineTo(0,10);
    self.ctx.lineTo(40,0);
    self.ctx.lineTo(0,-10);
    self.ctx.lineTo(0,10);
    self.ctx.strokeStyle = color;
    self.ctx.stroke();

    
    self.ctx.restore();
    self.ctx.restore();

  }

  self.drawHealthBar = function(id, x, y, health){
    var color = "";
    if(health > 80){
      color = "lime";
    }else if(health > 60){
      color = "yellow";
    }else if(health > 40){
      color = "orange"; 
    }else {
      color = "red";
    }


    self.ctx.fillStyle = color;
    self.ctx.fillRect(x-10,y-20,health,2);
  }

  self.drawNameTag = function(id, name, x, y){
    self.ctx.fillStyle = 'lime';
    self.ctx.fillText(name, x-10, y-25);
  }

  self.drawBullet = function (x, y){
    self.ctx.beginPath();
    self.ctx.strokeStyle = 'lime';
    self.ctx.arc(x-1,y-1,2,0,2*Math.PI);
    self.ctx.stroke();
  }

	self.draw = function(){
    self.ctx.fillStyle='black';
    self.ctx.fillRect(0,0,1000,800);
		// Draw updates 
		for(var id in self.playersArray){
			var p = self.playersArray[id];

      var color = "";
      if(id == self.id){
        color = "lime";
        p.name = self.name;
      }else{
        color = "rgb("+(Math.random()*155 +100).toFixed(0)+","+(Math.random()*155 +100).toFixed(0)+","+(Math.random()*155 +100).toFixed(0)+")";
      }

			if(p.health > 0){
        self.drawShip(p.id, p.angle, p.x, p.y, "lime");
        self.drawHealthBar(p.id, p.x, p.y, p.health);
        self.drawNameTag(p.id, p.name, p.x, p.y);
			}
		}

		$.each(self.bullets, function(i, b){
			if(!b.dead){
			   self.drawBullet(b.x,b.y);
      }
		});
	};

  return self;
};