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
var piByPi = Math.PI * 2;
var totalDeltaDustDensity = 0;
var enableSensor = true;
var sandPlayer = new SandPlayer();
var ctxDustChart = document.getElementById('dustChart').getContext('2d');
var myChart = new Chart(ctxDustChart, options);
var audioEnable = false;
var playAudioButton = document.querySelector('button');
var K = 0.5;
var Voc = 0.95;
var randomDustMin = 0;
var randomDustMax = 0;
var playCount = 0;
var hitPerSec = 0;
var deltaParticle = 0;
var dustMeter = document.querySelector('#dustMeter');
var collisionMeter = document.querySelector('#collisionMeter');
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
randomDustMin = parseInt(urlParams.get('rmin'));
randomDustMax = parseInt(urlParams.get('rmax'));
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

/* ======================= */

resize();

window.addEventListener('resize', resize, false);

// get sensor data in realtime

function updateParticleArray(latestDensity){
    var newDustDensity = latestDensity;
    var deltaDustDensity = newDustDensity - oldDustDensity;

    //console.log("old: " + oldDustDensity + ", new: " + newDustDensity + ", delta: " + deltaDustDensity);
    totalDeltaDustDensity = totalDeltaDustDensity + deltaDustDensity;
    //console.log("total: " + totalDeltaDustDensity);
    oldDustDensity = newDustDensity;
    
    if(totalDeltaDustDensity < 0) {
        deltaParticle = Math.ceil(totalDeltaDustDensity);
        totalDeltaDustDensity = totalDeltaDustDensity - deltaParticle;
    } else if (totalDeltaDustDensity > 0){
        deltaParticle = Math.floor(totalDeltaDustDensity);
        totalDeltaDustDensity = totalDeltaDustDensity - deltaParticle;
    }

    var count = 0;
    if(deltaParticle <= -1) {
        for(var i = 0; i < particles.length; i++){
            // release particles from circle
            if(!particles[i].isMovingOut()){
                var fadeInterval = Math.random() * (5-1) + 1;
                particles[i].setMovingOut(fadeInterval);
                count--;
            } 

            if (count == deltaParticle){
                break;
            }
        }
    }

    if (deltaParticle >= 1){
        // add particles to circle
        while(deltaParticle--){
            var pos = getCirclePosition(Math.random() * Math.PI * 2, Math.random() * radius / 4, width/2 , height/2);
            particles.push(new Particle(pos.x, pos.y, settings.size));
        }
    }
}



if(randomDustMin > 0 && randomDustMax > 0 && randomDustMin < randomDustMax){
    setInterval(()=>{
        var randomDensity = Math.random() * (randomDustMax - randomDustMin) + randomDustMin;
        updateChartData(randomDensity, hitPerSec);
        updateParticleArray(randomDensity);
        if(randomDensity > 150){
            dustMeter.className = "unhealthy";
        } else if(randomDensity > 70){
            dustMeter.className = "moderate";
        } else {
            dustMeter.className = "healthy";
        }
        dustMeter.innerHTML = randomDensity.toFixed(4) + " ug/m3"; 
        
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
        updateChartData(latestDensity, hitPerSec);
        updateParticleArray(latestDensity);
        dustMeter.innerHTML = latestDensity.toFixed(4) + " ug/m3"; 
    });
} else {
    generateParticles(settings.count, settings.size, settings.startOrigin.x, settings.startOrigin.y);
}

setInterval(() => {
    collisionMeter.innerHTML = hitPerSec.toFixed(4) + " hit/s";
    playCount = 0;
    date1 = Date.now();
}, 1000);

animate();

/* ======================= */

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

// function checkCollision (ball0, ball1) {
//     var dx = ball1.position.x - ball0.position.x,
//         dy = ball1.position.y - ball0.position.y,
//         dist = Math.sqrt(dx * dx + dy * dy);
  
//     //collision handling code here
//     if (dist < ball0.radius + ball1.radius && ball0.isMoving() && ball1.isMoving()) {
//       //calculate angle, sine, and cosine
//         console.log("move!")
//         ball0.setCollisionPosition();
//         ball1.setCollisionPosition();
//     }

// }



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
                hitPerSec = playCount / (date2 - date1) * 1000
                playCount++;
                sandPlayer.randomPlay();      
            }

            ball.getPosition(time);
        }

        // collision
        // for (let i = 0; i < particles.length - 1; i++) {
        //     for (let j = i + 1; j < particles.length; j++) {
        //         var ball0 = particles[i];
        //         var ball1 = particles[j];
        //         checkCollision(ball0, ball1);
                
        //     }
            
        // }

        
    }

    renderCanvas();
}






