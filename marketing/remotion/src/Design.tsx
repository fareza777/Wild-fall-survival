import React from 'react';
import {AbsoluteFill,Img,Interactive,interpolate,Easing,staticFile,useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';

loadFont({family:'Outfit',url:staticFile('fonts/outfit.ttf'),weight:'100 900'});
loadFont({family:'Cormorant',url:staticFile('fonts/cormorant-garamond.ttf'),weight:'300 700'});

export const Atmosphere:React.FC<{rain?:boolean}>=({rain=false})=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>{Array.from({length:rain?36:18},(_,i)=>{
  const x=(i*137.3+73)%1920,y=rain?((f*19+i*73)%1200)-80:1080-((f*(.35+i%3*.12)+i*97)%1200);
  return <div key={i} style={{position:'absolute',left:x,top:y,width:rain?1:2,height:rain?42:2,background:rain?'#c8d4dd':'#d79753',opacity:rain?.11:.3,rotate:rain?'15deg':'0deg',boxShadow:rain?'none':'0 0 8px #d98031'}}/>;
 })}</AbsoluteFill>;
};

export const Backdrop:React.FC<{src?:string}>=({src='art/hero.jpg'})=>{
 const f=useCurrentFrame();
 return <><Img src={staticFile(src)} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',scale:interpolate(f,[0,180],[1.035,1.075],{extrapolateRight:'clamp'})}}/><AbsoluteFill style={{background:'linear-gradient(90deg,rgba(8,12,17,.96) 0%,rgba(8,12,17,.8) 43%,rgba(8,12,17,.2) 100%)'}}/></>;
};

export const Feature:React.FC<{chapter:string;first:string;second:string;detail:string;clip:string;background:string;item?:string;reverse?:boolean;rain?:boolean}>=({chapter,first,second,detail,clip,background,item,reverse=false,rain=false})=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{backgroundColor:'#101115',color:'#f0e5d3',fontFamily:'Outfit',overflow:'hidden'}}>
  <Backdrop src={background}/><AbsoluteFill style={{backgroundColor:"#060a103d"}}/><Atmosphere rain={rain}/>
  <Interactive.Div name="Chapter" style={{position:'absolute',left:reverse?870:126,top:118,fontSize:25,letterSpacing:7,color:'#c5986b'}}>{chapter}</Interactive.Div>
  <Interactive.Div name="Feature headline" style={{position:'absolute',left:reverse?865:120,top:205,width:860,fontFamily:'Cormorant',fontSize:104,fontWeight:600,lineHeight:1.04,letterSpacing:-2,whiteSpace:'nowrap',translate:interpolate(f,[0,22],['0px 30px','0px 0px'],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)}),opacity:interpolate(f,[0,14],[0,1],{extrapolateRight:'clamp'})}}>{first}<br/><span style={{color:'#d4a472'}}>{second}</span></Interactive.Div>
  <Interactive.Div name="Feature description" style={{position:'absolute',left:reverse?870:126,top:513,width:710,fontSize:38,fontWeight:300,lineHeight:1.4,color:'#beb5a8',opacity:interpolate(f,[10,28],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>{detail}</Interactive.Div>
  {item?<Img src={staticFile(item)} style={{position:'absolute',left:reverse?920:140,top:658,width:245,height:245,objectFit:'contain',rotate:interpolate(f,[0,150],['-7deg','-2deg'],{extrapolateRight:'clamp'}),translate:interpolate(f,[0,30],['0px 25px','0px 0px'],{extrapolateRight:'clamp'}),filter:'drop-shadow(0 20px 30px #0009)'}}/>:null}
  <Interactive.Div name="Actual gameplay window" style={{position:'absolute',left:reverse?128:1210,top:75,width:488,height:900,borderRadius:19,overflow:'hidden',border:'1px solid #af835755',boxShadow:'0 25px 95px #000b',translate:interpolate(f,[0,24],['0px 16px','0px 0px'],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)})}}>
    <Video src={staticFile(clip)} muted objectFit="cover" style={{width:'100%',height:'100%'}}/>
  </Interactive.Div>
  <Interactive.Div name="Brand footer" style={{position:'absolute',left:reverse?870:126,top:944,fontFamily:'Cormorant',fontSize:33,letterSpacing:5,color:'#b2a496'}}>WILDFALL <span style={{fontFamily:'Outfit',fontSize:16,letterSpacing:4,color:'#c5986b'}}> / LAST EMBER</span></Interactive.Div>
  <Interactive.Div name="Footage label" style={{position:'absolute',left:reverse?128:1210,top:999,width:488,textAlign:'center',fontSize:17,letterSpacing:4,color:'#a29484'}}>ACTUAL GAMEPLAY</Interactive.Div>
 </AbsoluteFill>;
};
