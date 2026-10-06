import {AbsoluteFill,Sequence,staticFile,Html5Audio as Audio} from 'remotion';
import {Opening} from './Opening';
import {Shelter} from './Shelter';
import {Gather} from './Gather';
import {Craft} from './Craft';
import {Battle} from './Battle';
import {Explore} from './Explore';
import {Journal} from './Journal';
import {Closing} from './Closing';

export const Trailer=()=> <AbsoluteFill style={{backgroundColor:'#101115'}}>
 <Sequence name="Night is coming" durationInFrames={105}><Opening/></Sequence>
 <Sequence name="Keep the fire alive" from={105} durationInFrames={150}><Shelter/></Sequence>
 <Sequence name="Gather supplies" from={255} durationInFrames={150}><Gather/></Sequence>
 <Sequence name="Prepare safe water" from={405} durationInFrames={150}><Craft/></Sequence>
 <Sequence name="Face the wolf" from={555} durationInFrames={165}><Battle/></Sequence>
 <Sequence name="Explore the valley" from={720} durationInFrames={150}><Explore/></Sequence>
 <Sequence name="Find the signal" from={870} durationInFrames={90}><Journal/></Sequence>
 <Sequence name="Last ember" from={960} durationInFrames={120}><Closing/></Sequence>
 <Audio name="Original wind rain and fire - NO MUSIC" src={staticFile('audio/nature-bed.wav')} volume={.8}/>
 <Sequence name="Gather chop" from={278} durationInFrames={30}><Audio src={staticFile('audio/chop.ogg')} volume={.75}/></Sequence>
 <Sequence name="Gather leaves" from={300} durationInFrames={30}><Audio src={staticFile('audio/leaf.ogg')} volume={.5}/></Sequence>
 <Sequence name="Craft tool" from={430} durationInFrames={30}><Audio src={staticFile('audio/craft.ogg')} volume={.55}/></Sequence>
 <Sequence name="Spear swing" from={576} durationInFrames={30}><Audio src={staticFile('audio/swing.ogg')} volume={.7}/></Sequence>
 <Sequence name="Wolf impact" from={582} durationInFrames={30}><Audio src={staticFile('audio/hit.ogg')} volume={.75}/></Sequence>
 <Sequence name="Guard impact" from={628} durationInFrames={30}><Audio src={staticFile('audio/guard.ogg')} volume={.7}/></Sequence>
 <Sequence name="Field notes" from={880} durationInFrames={30}><Audio src={staticFile('audio/book.ogg')} volume={.45}/></Sequence>
 </AbsoluteFill>;
