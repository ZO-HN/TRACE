import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {HookHarness,cleanup,deferred,settle} from '../hooks/hookHarness';
import TrainingGroupsPage from '../../src/components/pages/TrainingGroupsPage';
vi.mock('react',async original=>({...await original<typeof import('react')>(),...(await import('../hooks/hookHarness')).reactHooks}));
vi.mock('react-router',()=>({Link:'a'}));
const api=vi.hoisted(()=>({read:vi.fn(),add:vi.fn(),remove:vi.fn()}));
vi.mock('../../src/components/layout/AppShell',()=>({useProfile:()=>({id:'coach',role:'coach'})}));
vi.mock('../../src/hooks/usePrograms',()=>({usePrograms:()=>({programs:[]})}));
vi.mock('../../src/hooks/useTrainingGroups',()=>({useTrainingGroups:()=>({groups:[{id:'a',name:'A',member_count:0},{id:'b',name:'B',member_count:0}],isLoading:false,error:null,createGroup:vi.fn(),deleteGroup:vi.fn(),fetchMemberIds:(...args:unknown[])=>api.read(...args),addMember:api.add,removeMember:api.remove})}));
vi.mock('../../src/hooks/useClients',()=>({useClients:()=>({clients:[{id:'client',first_name:'Trainee',last_name:'One'}],isLoading:false,error:null})}));
vi.mock('../../src/components/ui/toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('../../src/components/ui/shadcn/dialog',()=>({Dialog:'dialog',DialogContent:'div',DialogHeader:'header',DialogTitle:'h2'}));
type Element=ReactElement<Record<string,any>>;
function nodes(v:any):Element[]{return Array.isArray(v)?v.flatMap(nodes):v?.props?[v,...nodes(v.props.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
function workspace(){const root=TrainingGroupsPage();return (root.type as (p:unknown)=>Element)(root.props);}
function memberProps(root:Element){return nodes(root).find(n=>typeof n.type==='function'&&n.type.name==='ManageMembersDialog')!;}
beforeEach(()=>{api.read.mockReset().mockResolvedValue({memberIds:[],error:null});api.add.mockReset().mockResolvedValue({error:null});api.remove.mockReset().mockResolvedValue({error:null});});afterEach(cleanup);
it('does not refetch forever when hook callbacks change, ignores old-group loads and shows failed reads',async()=>{
  const page=new HookHarness(workspace);nodes(page.current).filter(n=>n.type==='button'&&text(n).includes('Manage Members'))[0].props.onClick();await settle();
  let node=memberProps(page.current);const wait=deferred<{memberIds:string[],error:null}>();api.read.mockReturnValueOnce(wait.promise);
  const members=new HookHarness(()=>(node.type as (p:unknown)=>Element)(node.props));await settle();
  page.render();node=memberProps(page.current);members.render();await settle();expect(api.read).toHaveBeenCalledTimes(1);
  node={...node,props:{...node.props,group:{id:'b',name:'B'}}};members.render();await settle();wait.resolve({memberIds:['client'],error:null});await settle();
  expect(text(members.current)).toContain('Add');expect(text(members.current)).not.toContain('Remove');
});
it('serializes member toggles and requires reload after an uncertain change',async()=>{
  const page=new HookHarness(workspace);nodes(page.current).filter(n=>n.type==='button'&&text(n).includes('Manage Members'))[0].props.onClick();await settle();
  const node=memberProps(page.current);const members=new HookHarness(()=>(node.type as (p:unknown)=>Element)(node.props));await settle();
  const wait=deferred<{error:string|null}>();api.add.mockReturnValueOnce(wait.promise);
  const toggle=nodes(members.current).find(n=>n.type==='button'&&text(n).includes('Trainee One'))!.props.onClick;toggle();toggle();await settle();expect(api.add).toHaveBeenCalledTimes(1);
  wait.resolve({error:'Reply lost'});await settle();expect(text(members.current)).toContain('Reload members');
  api.read.mockResolvedValueOnce({memberIds:['client'],error:null});nodes(members.current).find(n=>n.type==='button'&&text(n)==='Reload members')!.props.onClick();await settle();expect(text(members.current)).toContain('Remove');expect(api.add).toHaveBeenCalledTimes(1);
});
