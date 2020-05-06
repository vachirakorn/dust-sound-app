const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const path = require('path');
const port = process.env.PORT || 3000;

var bodyParser = require('body-parser');

var led_state = 0;
const MAX_SAMPLE = 10;
var sensorVoltages = [];

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {

	res.sendFile(__dirname + '/index.html');

});


io.on('connection', (socket) => {
	console.log('a user connected');

	setInterval(function(){
		socket.emit('sensor_voltage', sensorVoltages[sensorVoltages.length - 1]); 
	}, 1000);

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});



app.get('/ledstate', (req, res) => {

	res.setHeader('Content-Type', 'text/plain');
	res.status(200);
	res.send(led_state.toString());

});

app.post('/sensordata', (req, res) => {

	sensorVoltages.push(parseFloat(req.body.sensor_value));
	if(sensorVoltages.length > MAX_SAMPLE) {
		sensorVoltages.shift();
	}
	console.log("voltage = " + sensorVoltages[sensorVoltages.length - 1] + " V");
	res.status(200);
	res.send("Sensor data sent successfully");

});

app.post('/updateled', (req, res) => {

	console.log(req.body);

	led_state = parseInt(req.body.led_state);
	
	res.status(200);
	res.send("LED State send successfully");

});

http.listen(port, () => console.log("Server listening"));