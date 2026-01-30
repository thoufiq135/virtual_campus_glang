import Phaser from "phaser";
import { connect_nakama } from "./nakama_init";

let storeData = {};
const token = localStorage.getItem("stackenzo_token_gsin");

if (!token) {
  window.location.href = "/login";
}

// ================= PROFILE =================

async function fetch_profile() {
  console.log("fetch is calling");

  let raw = JSON.parse(localStorage.getItem("stackenzo_gsin_user_data"));

  if (!raw) {
    try {
      console.log("calling http://localhost:5000/profile");

      const response = await fetch("http://localhost:5000/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Profile fetch failed");

      raw = await response.json();
      localStorage.setItem("stackenzo_gsin_user_data", JSON.stringify(raw));
    } catch (e) {
      console.error("error fetching data", e);
      return null;
    }
  }

  // 🔥 flatten once
  storeData = raw.user;

  console.log("PROFILE READY:", storeData);

  return storeData;
}

// ================= MAIN SCENE =================

export default class Mainscene extends Phaser.Scene {

  constructor() {
    super("Mainscene");

    this.remotePlayers = {};
    this.loadingAvatars = {};
    this.lastSent = 0;

    this.rooms = [];
    this.currentRoom = null;
  }

  preload() {
    this.load.image("campus", "/Frame.png");
    this.load.json("layout", "./zones.json");
  }

  async create() {

    storeData = await fetch_profile();

    const res = await connect_nakama();

    this.socket = res.socket;
    this.matchId = res.matchId;
    this.myUserId = res.userId;

    this.map = this.add.image(0,0,"campus").setOrigin(0);
    this.physics.world.setBounds(0,0,this.map.width,this.map.height);

    const zones = this.cache.json.get("layout");

    this.walls = this.physics.add.staticGroup();

    zones.forEach(z=>{
      if(z.type==="collision"){
        this.walls.create(
          z.x+z.width/2,
          z.y+z.height/2
        )
        .setDisplaySize(z.width,z.height)
        .setVisible(false)
        .refreshBody();
      }

      if(z.type==="meeting"){
        this.rooms.push({
          roomId: z.id,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height
        });
      }
    });

    // debug rooms
    this.rooms.forEach(r=>{
      const g=this.add.graphics();
      g.lineStyle(2,0x00ff00,1);
      g.strokeRect(r.x,r.y,r.width,r.height);
    });

    // ================= MY AVATAR =================

    const myAvatar = storeData.avatar_url.replace("/svg","/png");
    this.load.image("myAvatar", myAvatar);

    this.load.once("complete",()=>{

      this.playerBody = this.physics.add.sprite(450,350,null);
      this.playerBody.setCollideWorldBounds(true);
      this.playerBody.setVisible(false);

      const sprite = this.add.sprite(0,0,"myAvatar").setScale(0.4);

      const name = this.add.text(0,-35,storeData.display_name,{
        fontSize:"12px",
        color:"#fff",
        stroke:"#000",
        strokeThickness:2
      }).setOrigin(0.5);

      this.playerVisual = this.add.container(this.playerBody.x,this.playerBody.y,[sprite,name]);

      this.playerBody.setSize(sprite.displayWidth*0.6,sprite.displayHeight*0.6);

      this.physics.add.collider(this.playerBody,this.walls);

      this.cameras.main.startFollow(this.playerBody);
      this.cameras.main.setLerp(0.1,0.1);

      this.events.on("postupdate",()=>{
        this.playerVisual.setPosition(this.playerBody.x,this.playerBody.y);
      });

    });

    this.load.start();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.setupNakama();
  }

  // ================= NAKAMA =================

  setupNakama(){

    this.socket.onmatchpresence = presence => {
      (presence.leaves || []).forEach(p=>{
        this.removeRemotePlayer(p.user_id);
      });
    };

    this.socket.onmatchdata = msg => {

      if(msg.op_code!==1) return;

      const data = JSON.parse(new TextDecoder().decode(msg.data));
      if(data.userId===this.myUserId) return;

      this.moveRemotePlayer(data);
    };
  }

  // ================= ROOMS =================

  getRoomId(x,y){
    for(const room of this.rooms){
      if(
        x>=room.x &&
        x<=room.x+room.width &&
        y>=room.y &&
        y<=room.y+room.height
      ){
        return room.roomId;
      }
    }
    return null;
  }

  // ================= REMOTE =================

  moveRemotePlayer(data){
    let player=this.remotePlayers[data.userId];
    if(!player){
      this.spawnRemotePlayer(data);
      return;
    }

    this.tweens.add({
      targets:[player.container],
      x:data.x,
      y:data.y,
      duration:80,
      ease:"Linear"
    });
  }

  spawnRemotePlayer(data){

    if(this.remotePlayers[data.userId]) return;

    const avatarKey="avatar_"+data.userId;

    if(this.textures.exists(avatarKey)){
      this.createRemotePlayer(data,avatarKey);
      return;
    }

    this.load.image(avatarKey,data.avatar.replace("/svg","/png"));

    this.load.on(`filecomplete-image-${avatarKey}`,()=>{
      this.createRemotePlayer(data,avatarKey);
    });

    if(!this.load.isLoading()) this.load.start();
  }

  createRemotePlayer(data,avatarKey){

    const sprite=this.add.sprite(0,0,avatarKey).setScale(0.4);

    const name=this.add.text(0,-35,data.name,{
      fontSize:"12px",
      color:"#fff",
      stroke:"#000",
      strokeThickness:2
    }).setOrigin(0.5);

    const container=this.add.container(data.x,data.y,[sprite,name]);

    this.remotePlayers[data.userId]={container};
  }

  removeRemotePlayer(userId){
    const p=this.remotePlayers[userId];
    if(!p) return;
    p.container.destroy();
    delete this.remotePlayers[userId];
  }

  // ================= UPDATE =================

  update(){

    if(!this.playerBody) return;

    const speed=220;
    let moving=false;

    this.playerBody.setVelocity(0);

    if(this.cursors.left.isDown){this.playerBody.setVelocityX(-speed);moving=true;}
    if(this.cursors.right.isDown){this.playerBody.setVelocityX(speed);moving=true;}
    if(this.cursors.up.isDown){this.playerBody.setVelocityY(-speed);moving=true;}
    if(this.cursors.down.isDown){this.playerBody.setVelocityY(speed);moving=true;}

    if(moving) this.sendMovement();

    this.currentRoom = this.getRoomId(this.playerBody.x,this.playerBody.y);
  }

  sendMovement(){

    if(!this.socket||!this.matchId) return;

    const now=Date.now();
    if(now-this.lastSent<100) return;
    this.lastSent=now;

    const roomId=this.getRoomId(this.playerBody.x,this.playerBody.y);

    this.socket.sendMatchState(this.matchId,1,JSON.stringify({
      userId:this.myUserId,
      x:this.playerBody.x,
      y:this.playerBody.y,
      roomId,
      name:storeData.display_name,
      avatar:storeData.avatar_url.replace("/svg","/png")
    }));
  }
}
