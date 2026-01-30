import React, { useEffect } from 'react'
import Phaser from "phaser";
import { congif } from './phaser/phaserConfig';

const Campus = () => {
    useEffect(()=>{
        const game=new Phaser.Game(congif)
        return ()=>{
            game.destroy()
        }
    },[])
  return (
<>
    

    <div id='game-container'>
      
    </div></>
  )
}

export default Campus;
