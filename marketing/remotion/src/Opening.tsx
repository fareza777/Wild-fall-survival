import {AbsoluteFill,Interactive,interpolate,useCurrentFrame} from 'remotion';
import {Backdrop,Atmosphere} from './Design';
export const Opening=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{backgroundColor:'#101115',fontFamily:'Outfit',color:'#f4e8d4'}}>
  <Backdrop/><Atmosphere rain/>
  <Interactive.Div name="Opening tension" style={{position:'absolute',left:130,top:150,fontSize:28,letterSpacing:7,color:'#d3a675'}}>COLD. HUNGRY. STILL ALIVE.</Interactive.Div>
  <Interactive.Div name="Immediate hook" style={{position:'absolute',left:118,top:295,fontFamily:'Cormorant',fontWeight:600,fontSize:184,lineHeight:.86,letterSpacing:-4,translate:interpolate(f,[0,105],['0px 12px','0px -6px'])}}>NIGHT<br/><span style={{color:'#d6a576'}}>IS COMING.</span></Interactive.Div>
  <Interactive.Div name="Hook question" style={{position:'absolute',left:130,top:705,fontSize:39,fontWeight:300,letterSpacing:1,opacity:interpolate(f,[15,35],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>What will you do before the light fades?</Interactive.Div>
  <Interactive.Div name="Title signature" style={{position:'absolute',left:130,bottom:108,fontFamily:'Cormorant',fontSize:36,letterSpacing:5,color:'#b7aa98'}}>WILDFALL / LAST EMBER</Interactive.Div>
 </AbsoluteFill>;
};
