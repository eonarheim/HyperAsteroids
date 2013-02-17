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
 	self.bullets = {};
 	self.id = 0;
 	self.x = 0;
 	self.y = 0;
 	self.angle = 0.0;
 	self.dead = false;
  	var socket = io.connect('http://localhost:8080', {
    	reconnect: false
	});
  	socket.on('connect',function(){
  		$('#game').empty();
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
  		if(data.id == self.id){
  			if(data.health <= 0){
  				$('#loseModal').show();
  				self.dead = true;
  				socket.disconnect();
  			}
  			self.angle = data.angle;
  		}


  		self.players[data.id] = data;
	});

	socket.on(Client.bullet, function (data){
		
		self.bullets[data.id] = data;
		
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
  	self.drawHUD = function(){

  	}

  	self.drawShip = function(id, angle, x, y, color){
  		var triangle = 
  		"<svg>"+
			"<polygon id='player"+id+"' transform='rotate("+angle*180.0/Math.PI+" "+x+" "+y+") translate("+x+" "+y+")' points='0 10 0 -10 40 0' style='stroke:"+color+";stroke-width:3px' />"+
  		"</svg>"
  		return triangle;
  	}

  	self.updateShip = function(id, angle, x, y){
  		$('#player'+id).attr('transform', "rotate("+angle*180.0/Math.PI+" "+x+" "+y+") translate("+x+" "+y+")");
  	}

  	self.updateHealthBar = function(id, x, y, health){

  		$('#health'+id).attr("x", x-10);
  		$('#health'+id).attr("y", y-20);
  		$('#health'+id).attr("width", health);
  	}

  	self.drawHealthBar = function(id, x, y, health){
  		var healthBar = "<svg><rect id='health"+id+"' width="+50+" height="+2+" x="+(x-10)+" y="+(y-20)+" style='fill:lime;stroke-width: 1;stroke:lime;'></rect></svg>";
  		return healthBar;
  	}

  	self.drawNameTag = function(id, name, x, y){
  		var nameTag = "<svg><text id='nametag"+id+"' transform='translate("+(x-10)+" "+(y-25)+")' fill='lime' style='font-family:Consolas' >"+name+"</text></svg>"
  		return nameTag;
  	}
  	self.updateNameTag = function(id,name, x, y){
  		$('#nametag'+id).attr('transform', "translate("+(x-10)+" "+(y-25)+")");
  		$('#nametag'+id).innerHtml = name;
  	}

  	

  	self.draw = function(){
  		// Draw updates 
  		for(var id in self.players){
  			var p = self.players[id];
  			var domEl = $('#player'+id);
  			if(p.health < 0){
  				$('#nametag').remove();
  				$('#health').remove();
  				$('#player').remove();
  				delete self.players[id];
  				continue;
  			}
  			
  			if(id == self.id){
  				color = "lime";
  				p.name = self.name;
  			}else{
  				color = "rgb("+(Math.random()*155 +100).toFixed(0)+","+(Math.random()*155 +100).toFixed(0)+","+(Math.random()*155 +100).toFixed(0)+")";
  			}

  			if (document.getElementById('player'+p.id)) {
  				domEl.attr('transform', "rotate("+p.angle*180.0/Math.PI+" "+p.x+" "+p.y+") translate("+p.x+" "+p.y+")");
  				self.updateShip(p.id, p.angle, p.x, p.y);
  				self.updateHealthBar(p.id, p.x, p.y, p.health);

  				self.updateNameTag(p.id, p.name, p.x, p.y);
  			}else{
  				//var nameTag = self.drawNameTag(p.id, p.name, p.x, p.y);
  				var healthBar = self.drawHealthBar(p.id, p.x, p.y, p.health);
  				var ship = self.drawShip(p.id, p.angle, p.x, p.y, color);

				$("#game").append(ship);		
  				$("#game").append(healthBar);
  				//$("#game").append(nameTag);

  				var nameTag = self.drawNameTag(p.id, p.name, p.x, p.y);
  				$("#game").append(nameTag);
  			}
  		}

  		
  		for(var id in self.bullets){
  			var b = self.bullets[id];
  			if(b.dead){
				delete self.bullets[b.id];
  				$('#bulletcontainer'+b.id).remove();
  			}else{
	  			var domEl = $('#bullet'+b.id);
	  			if (document.getElementById('bullet'+b.id)) {
	  				domEl.attr("cx", b.x);
	  				domEl.attr("cy", b.y);
	  			}else{
		  			var bullet = "<svg id='bulletcontainer"+b.id+"'><circle id='bullet"+b.id+"' cx='"+b.x+"' cy='"+b.y+"' r='3' stroke='lime' stroke-width='2' /></svg>"
		  			$("#game").append(bullet);
	  			}
  			}
  		};
			
  	};



  	return self;
};