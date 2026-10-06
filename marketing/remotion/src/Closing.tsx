import {AbsoluteFill,Img,Interactive,interpolate,useCurrentFrame,staticFile} from 'remotion';
import {Backdrop,Atmosphere} from './Design';
export const Closing=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{backgroundColor:'#101115',color:'#f4e8d4',fontFamily:'Outfit'}}>
  <Backdrop/><Atmosphere/>
  <Img src={staticFile('art/icon.png')} style={{position:'absolute',left:110,top:130,width:158,height:158,borderRadius:25,opacity:interpolate(f,[0,15],[0,1],{extrapolateRight:'clamp'})}}/>
  <Interactive.Div name="Game title" style={{position:'absolute',left:105,top:340,fontFamily:'Cormorant',fontSize:182,fontWeight:600,letterSpacing:-2,translate:interpolate(f,[0,35],['0px 20px','0px 0px'],{extrapolateRight:'clamp'})}}>WILDFALL</Interactive.Div>
  <Interactive.Div name="Game subtitle" style={{position:'absolute',left:126,top:543,fontSize:41,letterSpacing:22,color:'#d2a274'}}>LAST EMBER</Interactive.Div>
  <Interactive.Div name="Final hook" style={{position:'absolute',left:120,top:704,fontFamily:'Cormorant',fontSize:67,color:'#e7d7c1'}}>How long will your ember last?</Interactive.Div>
  <Interactive.Div name="Platform and genre" style={{position:'absolute',left:126,top:899,fontSize:24,letterSpacing:6,color:'#bfae98'}}>A WILDERNESS SURVIVAL GAME FOR ANDROID</Interactive.Div>
  <AbsoluteFill style={{backgroundColor:'#07090c',opacity:interpolate(f,[103,119],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>
 </AbsoluteFill>;
};
