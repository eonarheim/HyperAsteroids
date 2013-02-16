/// Client model

// enum of possible actions the server can recieve from the client
var Server = {};
Server.move = "move"; // data : {id: somenumber, forward: true|false, rotation: radians}
Server.fire = "fire"; // data :  {id: somenumber, rotation: radians}

// enum of actions sent to client
var Client = {};
Client.start = "start"; //data: {id: somenumber}
Client.player = "player"; // data: {id: somenumber, x: somenumber, y: sumnumber}
Client.bullet = "bullet"; // data: {x: somenumber, y: somenubmer}
Client.dead = "dead"; //data: {id: somenumber}


var Game = function() {

  	var self = this;
 	self.players = {};
 	self.id = 0;
 	self.x = 0;
 	self.y = 0;
 	self.angle = 0.0;

  	var socket = io.connect('http://localhost:8080');
	socket.on(Client.start, function(data){
		self.id = data.id;
		self.x = data.x;
		self.y = data.y;
		self.players[data.id] = data;
	});

  	socket.on(Client.player, function (data) {
  		console.log(data);
  		if(data.id == self.id){
  			self.angle = data.angle;
  		}
  		self.players[data.id] = data;
	});


  	self.move = function(move, angle){
  		socket.emit(Server.move, 
  			{
  				id: self.id,
  				forward: move,
  				rotation: angle 
  			});
  	}

  	self.fire = function(angle) {
  		socket.emit(Server.fire, 
  			{
				id: self.id,
  				rotation: angle 
  			});
  	}

  	self.draw = function(){
  		// Draw updates 
  		for(var id in self.players){
  			var p = self.players[id];
  			var domEl = $('#player'+id);

  			if (document.getElementById('player'+p.id)) {
  				domEl.attr('transform', "rotate("+p.angle*180.0/Math.PI+" "+p.x+" "+p.y+") translate("+p.x+" "+p.y+")");
  			}else{
  				var triangle = "<svg><polygon id='player"+p.id+"' transform='rotate("+p.angle*180.0/Math.PI+" "+p.x+" "+p.y+") translate("+p.x+" "+p.y+")' points='0 10 0 -10 20 0' style='stroke:lime;stroke-width:3px' /></svg>"
  				//rotate("+p.angle*180.0/Math.PI+" "+p.x+" "+p.y+")
  				var test = "<polygon id='player"+p.id+"' transform='rotate(45 100 100) translate(100 100)' points='0 10 0 -10 20 0' style='stroke:lime;stroke-width:3px' />"
				$("#game").append(triangle);		
  			}

  		}
			
  	};



  	return self;
};