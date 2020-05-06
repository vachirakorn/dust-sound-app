var piByPi = Math.PI*2; // full circle
var Particle;

Particle = function(posx,posy,radius) {

    if(radius < 0) {
        throw "Ошибка! Дан радиус частицы "+radius+" пикселей, но радиус не может быть отрицательным!";
    }

    this.position = {
        x: posx || 0,
        y: posy || 0
    };

    this.startPoint = this.position;

    if(typeof radius == 'function') {
        this.radius = radius();
    } else {
        this.radius = radius || 0;
    }

    this.status = 'standing';

    this.direction = this.position;
 
    this.speed = 1; 

    this.spotlightTimeStamp = undefined;

    this.opacity = 1;

    this.fadeInteval = 1;



};

Particle.prototype.fade = function() {
    this.opacity -= 1 / (this.fadeInterval * 60.0);
};

Particle.prototype.isFaded = function() {
    
    return this.opacity <= 0;
};

Particle.prototype.isHit = function() {
    return this.hitWall || this.hitParticle;
};

Particle.prototype.setHitWall = function(bool) {
    this.hitWall = bool;
};

Particle.prototype.isMoving = function() {
    return this.status == 'moving';
};

Particle.prototype.isMovingOut = function() {
    return this.status == 'moving-out';
};

Particle.prototype.isStanding = function() {
    return this.status == 'standing';
};

Particle.prototype.setCollisionPosition = function(fadeInterval) {
    this.status = 'standing';
    this.spotlightTimeStamp = undefined;
    this.startPoint = this.position;
};

Particle.prototype.setMovingOut = function(fadeInterval) {
    this.fadeInterval = fadeInterval;
    this.status = 'moving-out';
};

Particle.prototype.stop = function() {
    this.status = 'standing';
    this.spotlightTimeStamp = undefined;
    this.direction = this.position;

    return this;
};

Particle.prototype.move = function(posx,posy,speed) {

    this.status = 'moving';

    this.spotlightTimeStamp = undefined;

    var deltaX = posx - this.position.x,
        deltaY = posy - this.position.y,
        distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

    this.direction = {
        x: posx,
        y: posy,
        distance: distance,
        sin: deltaY / distance,
        cos: deltaX / distance
    };

    this.startPoint = this.position;

    this.speed = speed || 1;

    return this;

};

Particle.prototype.getPosition = function(movetime) {

    var time = movetime / 1000; // convert to millisecond

    if(this.status == 'moving' || this.status == 'moving-out') {
        if(this.spotlightTimeStamp) {
            var deltaTime = time - this.spotlightTimeStamp, // time since starting
                distance = (deltaTime * this.speed); // s = v * t

            var posy = this.direction.sin * distance, // sin0 * distance = new pos y
                posx = this.direction.cos * distance; // cos0 * distance = new pos x

            this.position = {
                x: posx + this.startPoint.x,
                y: posy + this.startPoint.y
            };

            // at the destination pos
            if(distance >= this.direction.distance) {
                if (this.status == 'moving-out') {
                    this.fade();
                } else {
                    this.status = 'standing';
                    this.spotlightTimeStamp = undefined;
                    this.position = this.direction;
                }   
            }

        } else {
            this.spotlightTimeStamp = time; // start time
        }
    }

    return this.position;
};


/*
    x	The x-coordinate of the center of the circle	
    y	The y-coordinate of the center of the circle	
    r	The radius of the circle	
    sAngle	The starting angle, in radians (0 is at the 3 o'clock position of the arc's circle)	
    eAngle	The ending angle, in radians	
    counterclockwise	Optional. Specifies whether the drawing should be counterclockwise or clockwise. False is default, and indicates clockwise, while true indicates counter-clockwise.

*/
Particle.prototype.draw = function(ctx) {
    ctx.fillStyle = "rgba(255, 255, 255, " + this.opacity + ")";

    ctx.beginPath();
    ctx.arc(this.position.x,this.position.y,this.radius,0,piByPi,false);
    ctx.closePath();
    ctx.fill();
};

export default Particle;