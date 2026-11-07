import {afterEach,expect,it,vi} from 'vitest';
import {HookHarness,cleanup,settle} from '../hooks/hookHarness';
import MediaViewer from '../../src/components/media/MediaViewer';
vi.mock('react',async original=>({...await original<typeof import('react')>(),...(await import('../hooks/hookHarness')).reactHooks}));
const api=vi.hoisted(()=>({type:'image/png',url:'https://fixture.test/a',retry:vi.fn()}));
vi.mock('../../src/hooks/useMediaUrl',()=>({useMediaUrl:()=>({url:api.url,contentType:api.type,retry:api.retry,loading:false,error:null})}));
afterEach(cleanup);
it('renders extensionless files by verified type and exposes explicit player error recovery',async()=>{
  const hook=new HookHarness(()=>MediaViewer({objectKey:'file/owner/op'}));expect(hook.current.type).toBe('img');
  hook.current.props.onError();await settle();expect(hook.current.props.children[0].props.children).toContain('could not be displayed');hook.current.props.children[1].props.onClick();await settle();expect(api.retry).toHaveBeenCalled();
  api.type='video/mp4';hook.render();expect(hook.current.type).toBe('video');const oldError=hook.current.props.onError;
  api.url='https://fixture.test/new';hook.render();oldError();await settle();expect(hook.current.type).toBe('video');
});
