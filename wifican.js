/*
In the node.js intro tutorial (http://nodejs.org/), they show a basic tcp
server, but for some reason omit a client connecting to it.  I added an
example at the bottom.

Save the following server in example.js:
*/

/*
var net = require('net');

var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n\r');
	socket.pipe(socket);
});

server.listen(1337, '127.0.0.1');
*/
/*
And connect with a tcp client from the command line using netcat, the *nix
utility for reading and writing across tcp/udp network connections.  I've only
used it for debugging myself.

$ netcat 127.0.0.1 1337

You should see:
> Echo server

*/

/* Or use this example tcp client written in node.js.  (Originated with
example code from
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */
var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var fs = require('fs');


var getTime = function () {
   var date = new Date();     //new date object
   return date.getTime();     //gets current time
};
var timeInit = getTime();     //gets the time that the server was started

var getDynamicDate = function(){    //gets the dynamic starting date
  var d = new Date();
  var date = (
  (d.getFullYear().toString())
  + "_"
  + (d.getMonth()+1).toString())        //the actual date
  + "_"
  + (d.getDate()).toString()
  + "_";

  var startTime = (d.getHours()).toString()    //the time
  + "_"
  + d.getMinutes().toString()
  + "_"
  + d.getSeconds().toString();
  console.log(date+startTime);

  return date + startTime;
};

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function(req, res, next) {
   res.sendFile(__dirname + '/index.html');
});

server.listen(4200);        //public access port is 4200

io.on('connection', function (socket) {     //writes a message to the console when a client connects
  console.log('web client connected')
   //this is a sample
   socket.on('clienttoserver', function (id, dlc, bytes) {

      console.log(bytes)
      sendCANFrame(id, dlc, bytes.slice(0,dlc))
   });
  socket.on('openCandapter', function ()
   {
      openCandapter();
   });
   socket.on('closeCandapter', function () {
      console.log('stopping candapter');
      closeCandapter();
      endDate = getDynamicDate();
      fs.appendFileSync(logPath,"\n" + endDate);
   });
   //send CAN frame to Main Logic Module which calibrates high values
   socket.on('calibrateHigh', function (throttle1, throttle2) {
      throttle1 = throttle1 || 0;
      throttle2 = throttle2 || 0;
      //TODO Send can frame
   });
   socket.on('calibrateLow', function (throttle1, throttle2) {
      throttle1 = throttle1 || 0;
      throttle2 = throttle2 || 0;
      //TODO send can frame
   });

})

//send can Frame
var sendCANFrame = function (id, dlc, data) {
   message = 'T';       //identifier bit
   idStr = id.toString(16);
   idStr = constWidthFromRight(idStr, 3, '0');
   message += idStr;
   message += Math.max(1, Math.min(dlc, 8)).toString();
   message += data.map(function (x) {
      return idStr = constWidthFromRight(x, 2,'0'); //make all bytes in array hexstring
   }).reduce(function(a, b) {
      return a + b;
   });
   message += '\r'
   console.log(message);
   candapterComPort.write(message);
};

var openCandapter = function () {
  console.log('starting candapter');
  console.log(dict);
   candapterComPort.write('O\r')
}

var closeCandapter = function () {
   candapterComPort.write('C\r')
}

var constWidthFromRight = function(s, w, c) {
   c = c || ' '
   for (var i = 0; i < w; i++)
   {

      s = c + s;
   }
   return(s.substring(s.length - w, s.length));
};

var net = require('net');
var client = new net.Socket();


//uncomment if planning to use socat, for talking to candapter
//Chris and Ben changed to serialport on 01-11-18

// client.connect(9922, '127.0.0.1', function() {
// 	console.log('Connected to Candapter');
// 	client.write('Hello, server! Love, Client.');
// });

var SerialPort = require ('serialport');
var candapterComPort = new SerialPort('/dev/ttyUSB0', {autoOpen: false});


candapterComPort.open(function(err) {
  if (err){
    console.log("\nError opening candapterComPort. Continuing without CANdapter\n");
    return;
  }
  else
  {
    openCandapter();
  }
});

client.on('close', function() {
	console.log('Connection closed');
});

log = getDynamicDate();       //date and time together

var start = Date.now();

var logPath = "/home/pi/Public/logger/logs/" + log + ".txt";     //path to the new log file
try{
  console.log("logging to " + logPath);
  fs.appendFileSync("/home/pi/Public/logger/runs.txt", log + "\n");     //adds the date to a file containing dates of all the runs
  fs.appendFileSync(logPath, log);        //creates and adds the current date and time to a new run log file
}catch (err){
  console.log("\nError: unable to locate file or directory.\n", err.stack);
}


var millis = 0;
var getMillis = function(){       //gets the elapsed time in milliseconds since startup
    return (Date.now() - start).toString();
}

////parse can frame stuff
receivingCanFrame = Buffer.alloc(21);
receivingCanFrameIndex = 0;

var CanParseStateType = {
	BEFORE_FRAME: 0,
	RECEIVING_FRAME: 1
}

var canParseState = CanParseStateType.BEFORE_FRAME;


//candapterComPort.on('data', function(candapterData) {
fs.readFile('fakeCANdapter.fake','utf8', function(err, candapterData) {
	i = 0
	console.log(candapterData);
	console.log(candapterData.charCodeAt(0));
	//116 = 't' in ascii
	while (i < candapterData.length)
	{
		while (i < candapterData.length && candapterData.charCodeAt(i) != 116 && canParseState == CanParseStateType.BEFORE_FRAME)
		{
			i++;
		}
		while (i < candapterData.length && candapterData.charCodeAt(i) != 13 && receivingCanFrameIndex <= 21)
		{
			i++
			console.log(candapterData[i]);
			canParseState = CanParseStateType.RECEIVING_FRAME;
			receivingCanFrame[receivingCanFrameIndex] = candapterData[i]
			receivingCanFrameIndex ++;
		}
		if (candapterData.charCodeAt(i) == 13)  //carriage return /r
		{
			//console.log('Parsed: ' + receivingCanFrame.toString('ascii', 0, receivingCanFrameIndex) + '\n\r');
			singleFrame = candapterData.toString('ascii').substring(0,receivingCanFrameIndex),
			console.log(singleFrame);
			io.emit("candata",
				singleFrame,
				getTime() - timeInit
				);
			fs.appendFileSync(logPath,
				Msg2Csv(candapterData.toString('ascii').substring(0,receivingCanFrameIndex)) + '\n');
			receivingCanFrameIndex = 0;
		}
		canParseState = CanParseStateType.BEFORE_FRAME
	}
  //writes CAN messages to log files
//  fs.appendFileSync(logPath, candapterData + '\n');
//  millis = getMillis();
//  fs.appendFileSync(logPath, millis);
	//console.log('Received: ' + candapterData + '\n\r');

});

var Msg2Csv = function(msg) {
	datalength = 	msg.substring(4,5);
	csvline = 	getMillis() + ',' +
			msg.substring(1,4) + ',' +
			msg.substring(4,5) + ',' +
			msg.substring(5, 7 + (datalength*2));
	return csvline;
};

var formatCAN = function(msg) {
   // CAN message is something like T3CF411223344[CR], where 11223344 is the data
   var truncMsg = msg + "";

   truncMsg = truncMsg.substring(1, msg.length); // Clean off the ends
   var address = '0x' + truncMsg.substring(0, 3);     //device address

   var len = truncMsg.substring(3, 4);     //
   var data = truncMsg.substring(4); // Trim down to just data
   // for (i = 0; i < msg.length; i += 2) {
   //     dat += String(parseInt(msg.substring(i, i + 2), 16));
   // }
   // dat = Integer.parseInt(dat);
   return partByAddress(address) + ': ' + data;
   // + convertByAddress(address, dat);
};

var partByAddress = function(address) {
  return dict[address];
};

var dict = {
    '0x215': 'Coolant_Flow',
    '0x500': 'Pedal_Box1',
    '0x501': 'Pedal_Box2',
    '0x502': 'Pedal_Box3',
    '0x181': 'Motor_Controller',
    '0x300': 'Dash_High',
    '0x301': 'Dash_Low',
    '0x401': 'BMS',
    '0x402': 'BMS',
    '0x403': 'BMS',
    '0x404': 'BMS',
    '0x405': 'BMS',
    '0x406': 'BMS',
    '0x407': 'BMS',
    '0x408': 'BMS',
    '0x03B': 'BMS',
    '0x03C': 'BMS',
    '0x200': 'Wheel_Spd_FR',
    '0x201': 'Wheel_Spd_FL',
    '0x202': 'Wheel_Spd_RR',
    '0x202': 'Wheel_Spd_RL',
    '0x210': 'Pedal_Box-Torque',
    '0x503': 'Calibrate',
    '0x350': 'Dashboard',
    '0x420': 'Accelerometer'
  };
