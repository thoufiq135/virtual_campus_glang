import Phaser, { Physics, Scene } from "phaser"
import Mainscene from "./Game"
export const congif={
type:Phaser.AUTO,
  width: 1900,
        height: 1050,
        parent:"game-container",
        physics:{
            default:"arcade",
        },
scene:[Mainscene]
}