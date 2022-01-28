import Particle from './particles/index.js';
import SandPlayer from './audio/SandPlayer.js';
import options from './chart/config.js';
var socket = io();
var particleCanvas = document.querySelector('#particlesField');
var ctxParticle = particleCanvas.getContext('2d');
var maxRadius = 200;
var width = window.innerWidth;
var height = window.innerHeight;
var radius = Math.min(width/2,height/2) < maxRadius? Math.min(width/2,height/2):maxRadius;
const piByPi = Math.PI * 2;
var totalDeltaDustDensity = 0;
var enableSensor = true;
var sandPlayer = new SandPlayer();
var ctxDustChart = document.getElementById('dustChart').getContext('2d');
var myChart = new Chart(ctxDustChart, options);
var audioEnable = false;
var playAudioButton = document.querySelector('button');
const K = 0.5;
const Voc = 0.95;
var g_randomMin = 0;
var g_randomMax = 0;
var g_countPlay = 0;
var g_hitPerSec = 0;
var g_deltaParticle = 0;
var g_dustMeter = document.querySelector('#dustMeter');
var g_domCollisionMeter = document.querySelector('#collisionMeter');
var oldDustDensity = 0;
var date1 = Date.now();
const synth = new Tone.Synth().toMaster();
Tone.Buffer.on("load", async function() {
    //play a middle 'C' for the duration of an 8th note
    synth.triggerAttackRelease("C4", "8n");
});

// particle setting
var particles = [];
var presetDefault = {
    count: 1,
    size: 2.5,
    minSpeed: 100,
    maxSpeed: 500,
    startOrigin: {
        x: width / 2,
        y: height / 2
    }
};

var settings = presetDefault;


// input
const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);

K = urlParams.get('k');
Voc = urlParams.get('voc');
g_randomMin = parseInt(urlParams.get('rmin'));
g_randomMax = parseInt(urlParams.get('rmax'));
console.log("K: " + K + ", Voc: " + Voc);

playAudioButton.addEventListener('click', _.throttle(async () => {
    if(audioEnable){
        await Tone.start()
	    console.log('audio is ready')
    } else {

    }
	
}, 1000))



//attach a click listener to a play button

function updateChartData(sensorValue, hitPerSec) {

    // append the new data to the existing chart data
    myChart.data.datasets[0].data.push({
        x: Date.now(),
        y: sensorValue
    });

    myChart.data.datasets[1].data.push({
        x: Date.now(),
        y: hitPerSec
    });

    // update chart datasets keeping the current animation
    myChart.update({
        preservation: true
    });
}



window.generateParticles = function(count, size, originX, originY) {

    while(count--) {
        var x = originX || Math.random() * window.innerWidth,
            y = originY || Math.random() * window.innerHeight;

        particles.push(new Particle(x,y,size));
    }

};


/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

function getCirclePosition(angle, radius, offsetX, offsetY){
    return {
        x: Math.cos(angle)* radius + offsetX,
        y: Math.sin(angle)* radius + offsetY
    };
}

function hitCircle(posx, posy, radius){
    //console.log(Math.round((posx * posx + posy * posy + Number.EPSILON) * 100) / 100 - Math.round((radius * radius + Number.EPSILON)* 100) / 100);           
    return posx * posx + posy * posy >= (radius * radius) - 1;
}


// time unit is microsecond 
function animate(time) {
    requestAnimationFrame(animate); // animation function be called before the browser performs 
                                    // the next repaint. 60 times per second

    if(width !== particleCanvas.width) {
        particleCanvas.width = width;
    }

    if(height !== particleCanvas.height) {
        particleCanvas.height = height;
    }

    if(particles) {
        
        // update each particle
        for(let i = particles.length - 1 ; i >= 0; i--) {
            var ball = particles[i];

            // remove faded particles from array
            if(ball.isFaded()){
                particles.splice(i,1);
                // console.log("remove particle : " + i + ", particles number: " + particles.length)
                continue;
            }

            if(ball.isStanding() && hitCircle(ball.position.x - width/2, ball.position.y - height/2, radius)){
                // console.log("ball " + i + " hit circle line at x: " + ball.position.x + ", y: " + ball.position.y + ", ball.status: " + ball.status)
                ball.setHitWall(true);
                //console.log((Math.pow(ball.position.x - width/2, 2) + Math.pow(ball.position.y - height/2, 2) - (radius * radius )));
            } else {
                ball.setHitWall(false);
            }

            if(ball.isStanding()) {
                var angle = Math.random()*Math.PI*2;
                var pos = getCirclePosition(angle, radius, width/2, height/2)
                var speed = Math.random() * (settings.maxSpeed / 2) + settings.minSpeed;
                ball.move(pos.x,pos.y,speed);
            } 

            if(ball.isHit()){
                let date2 = Date.now();
                g_hitPerSec = g_countPlay / (date2 - date1) * 1000
                g_countPlay++;
                sandPlayer.randomPlay();      
            }

            ball.getPosition(time);
        }   
    }

    renderCanvas();
}

// get sensor data in realtime

function updateParticleArray(latestDensity){
    var newDustDensity = latestDensity;
    var deltaDustDensity = newDustDensity - oldDustDensity;
    totalDeltaDustDensity = totalDeltaDustDensity + deltaDustDensity;
    oldDustDensity = newDustDensity;
    
    if(totalDeltaDustDensity < 0) {
        g_deltaParticle = Math.ceil(totalDeltaDustDensity);
        totalDeltaDustDensity = totalDeltaDustDensity - g_deltaParticle;
    } else if (totalDeltaDustDensity > 0){
        g_deltaParticle = Math.floor(totalDeltaDustDensity);
        totalDeltaDustDensity = totalDeltaDustDensity - g_deltaParticle;
    }

    var count = 0;
    if(g_deltaParticle <= -1) {
        for(var i = 0; i < particles.length; i++){
            // release particles from circle
            if(!particles[i].isMovingOut()){
                var fadeInterval = Math.random() * (5-1) + 1;
                particles[i].setMovingOut(fadeInterval);
                count--;
            } 

            if (count == g_deltaParticle){
                break;
            }
        }
    }

    if (g_deltaParticle >= 1){
        // add particles to circle
        while(g_deltaParticle--){
            var pos = getCirclePosition(Math.random() * Math.PI * 2, Math.random() * radius / 4, width/2 , height/2);
            particles.push(new Particle(pos.x, pos.y, settings.size));
        }
    }
}


function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    radius = Math.min(width/2,height/2) < maxRadius? Math.min(width/2,height/2):maxRadius;
    if (particles) {

        for(var i = 0 ; i < particles.length; i++) {
            if(particles[i].position.x > width) {
                particles[i].stop();
                particles[i].position.x = width;
            }

            if(particles[i].position.y > height) {
                particles[i].stop();
                particles[i].position.y = height;
            }

        }
    }

}

function renderCanvas() {

    ctxParticle.globalCompositeOperation = 'destination-out';
    ctxParticle.fillStyle = 'rgba(4, 18, 47, 0.1)';

    ctxParticle.fillRect(0,0,width,height);

    ctxParticle.globalCompositeOperation = 'source-over';
    ctxParticle.beginPath();

    ctxParticle.arc(width/2,height/2,radius,0,piByPi,false);
    ctxParticle.closePath();
    ctxParticle.fill();

    if(particles) {

        var i = (particles || []).length;
        while(i--) {
            particles[i].draw(ctxParticle);
        }

    }


}

// start

resize();

window.addEventListener('resize', resize, false);

// generate random number of particle
if(g_randomMin > 0 && g_randomMax > 0 && g_randomMin < g_randomMax){
    setInterval(()=>{
        let l_randomDensity = Math.random() * (g_randomMax - g_randomMin) + g_randomMin;
        updateChartData(l_randomDensity, g_hitPerSec);
        updateParticleArray(l_randomDensity);
        if(l_randomDensity > 150){
            g_dustMeter.className = "unhealthy";
        } else if(l_randomDensity > 70){
            g_dustMeter.className = "moderate";
        } else {
            g_dustMeter.className = "healthy";
        }
        g_dustMeter.innerHTML = l_randomDensity.toFixed(4) + " ug/m3"; 
        
    }, 1000);
    
} else if(enableSensor){
    socket.on('sensor_voltage', function(Vo){
        
        // Convert to Dust Density in units of ug/m3.
        var dV = Vo - Voc;
        if ( dV < 0 ) {
            dV = 0;
            // Voc = Vo;
        }
        var latestDensity = dV / K * 100;
        updateChartData(latestDensity, g_hitPerSec);
        updateParticleArray(latestDensity);
        g_dustMeter.innerHTML = latestDensity.toFixed(4) + " ug/m3"; 
    });
} else {
    generateParticles(settings.count, settings.size, settings.startOrigin.x, settings.startOrigin.y);
}

setInterval(() => {
    g_domCollisionMeter.innerHTML = g_hitPerSec.toFixed(4) + " hit/s";
    g_countPlay = 0;
    date1 = Date.now();
}, 1000);

animate();


// end










