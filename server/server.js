// server.js Simple HTTP Web server implementation

// commonjs module for our game manager
var Asteroids = require('./game.js').Asteroids,
	 // built in node http server 
	 webServer = require('http').createServer(runServer),
	 // have socket.io listen on the same port as the webserver, also turn off verbose logging
	 io = require('socket.io').listen(webServer, {log:false}),
	 // built in node file system 
	 fs = require('fs');

// Start listening on your favorite port
webServer.listen(8081);


// Blacklisting is a losing game in security, for the sake of simplicity we will manually enumerate them
var whitelistedUrls = ["/","/index.html", "/client/asteroids.js", "/css/main.css", "/css/bootstrap.css", "/lib/bootstrap.js", "/monkey.js"];
var defaultUrl = "/index.html";
var contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
};

var getExtension = function(url){
	try{
		var extensionRegex = /^.*(\.[a-z]*)$/i; // dark magic
		return url.match(extensionRegex)[1];
	}catch(e){
		return '.html';
	}
};


// from socket.io how to
function runServer (req, res) {
	var url = req.url === "/"? defaultUrl: req.url;
	//console.log(url);
	// Only serve whitelisted urls for security reasons
	if (whitelistedUrls.indexOf(url) === -1){
		res.writeHead(404);
		return res.end("File not found");
	}

  	fs.readFile('.' + url,
	  	function (err, data) {
	    	if (err) {
	    		console.log(err);
	      	res.writeHead(404);
	      	return res.end('File not found');
	    	}

			res.writeHead(200, {"Content-Type": contentTypesByExtension[getExtension(req.url)]});
		 	res.end(data);
  });
}

// Start asteroids server
var game = new Asteroids(io);
game.start();