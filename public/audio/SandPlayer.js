var SandPlayer;

SandPlayer = function() {
    this.sandBuffer = [];

    this.sandBuffer.push(new Tone.Player({
        url: "./audio/sand_1.wav",
        loop:false
    }).toMaster());
    
    this.sandBuffer.push(new Tone.Player({
        url: "./audio/sand_2.wav",
        loop:false
    }).toMaster());
    
    this.sandBuffer.push(new Tone.Player({
        url: "./audio/sand_3.wav",
        loop:false
    }).toMaster());
    
    this.sandBuffer.push(new Tone.Player({
        url: "./audio/sand_4.wav",
        loop:false
    }).toMaster());
    
    this.sandBuffer.push(new Tone.Player({
        url: "./audio/sand_5.wav",
        loop:false
    }).toMaster());


}

SandPlayer.prototype.randomPlay = function() {
    let i = Math.floor(Math.random() * this.sandBuffer.length);
    this.sandBuffer[i].start();
}

export default SandPlayer;