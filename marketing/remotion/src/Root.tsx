import {Composition,Folder} from 'remotion';
import {Trailer} from './Trailer';
import {Opening} from './Opening';
import {Shelter} from './Shelter';
import {Gather} from './Gather';
import {Craft} from './Craft';
import {Battle} from './Battle';
import {Explore} from './Explore';
import {Journal} from './Journal';
import {Closing} from './Closing';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Wildfall-Trailer" component={Trailer} width={1920} height={1080} fps={30} durationInFrames={1080}/>
      <Folder name="Editable-scenes">
       <Composition id="Opening" component={Opening} width={1920} height={1080} fps={30} durationInFrames={105}/>
       <Composition id="Shelter" component={Shelter} width={1920} height={1080} fps={30} durationInFrames={150}/>
       <Composition id="Gather" component={Gather} width={1920} height={1080} fps={30} durationInFrames={150}/>
       <Composition id="Craft" component={Craft} width={1920} height={1080} fps={30} durationInFrames={150}/>
       <Composition id="Battle" component={Battle} width={1920} height={1080} fps={30} durationInFrames={165}/>
       <Composition id="Explore" component={Explore} width={1920} height={1080} fps={30} durationInFrames={150}/>
       <Composition id="Journal" component={Journal} width={1920} height={1080} fps={30} durationInFrames={90}/>
       <Composition id="Closing" component={Closing} width={1920} height={1080} fps={30} durationInFrames={120}/>
      </Folder>
    </>
  );
};
