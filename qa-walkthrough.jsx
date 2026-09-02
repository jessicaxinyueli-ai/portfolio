// Copperhill Q&A — "Add Questions" batch workflow walkthrough (self-contained)
// Screen-Studio-style animated recreation. Plain-DOM timeline (own rAF clock) so
// it renders/screenshots reliably and embeds cleanly. Mount via:
//   <x-import component-from-global-scope="QAWalkthrough" from="./qa-walkthrough.jsx">
const R = window.React;
const { useState, useEffect, useRef } = R;
const DUR = 16.5;

// ---- tiny easing + interpolate ----
const easeInOutCubic = t => t<0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
const easeOutCubic = t => (--t)*t*t+1;
function interp(input, output, ease=easeInOutCubic){
  return (t)=>{
    if(t<=input[0]) return output[0];
    if(t>=input[input.length-1]) return output[output.length-1];
    let i=0; while(t>input[i+1]) i++;
    const span=input[i+1]-input[i]; const local=span?(t-input[i])/span:0;
    return output[i]+(output[i+1]-output[i])*ease(local);
  };
}

// ---- palette ----
const C = {
  bg:'#d8d6d0', win:'#ffffff', border:'#e6e4de',
  navy:'#14324f', orange:'#e07a39', link:'#b9531f',
  head:'#6f6a61', line:'#eeece7', text:'#33322e', mut:'#8f8a80',
  pill:'#1c3c6e', chip:'#f1efec', chip2:'#e0ddd6', field:'#cfccc4', green:'#2f9e4f',
};
const WX=40, WY=30, WW=1200, WH=660, PL=800;

function Kebab(){ return R.createElement('div',{style:{color:'#b8b3aa',fontSize:15,lineHeight:'8px',transform:'translateY(-2px)'}},'⋮'); }
function Box({on}){ return R.createElement('div',{style:{width:13,height:13,border:`1.5px solid ${on?C.orange:'#c3bfb6'}`,borderRadius:3,background:on?C.orange:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}, on?R.createElement('div',{style:{color:'#fff',fontSize:10,lineHeight:1}},'✓'):null); }
function Pill(){ return R.createElement('span',{style:{background:C.pill,color:'#fff',fontSize:11,padding:'3px 12px',borderRadius:11,fontWeight:600}},'Open'); }
function Req({code,plus}){ return R.createElement('span',{style:{display:'inline-flex',gap:5,alignItems:'center'}},
  R.createElement('span',{style:{background:C.chip,color:'#6a655c',fontSize:10.5,padding:'3px 8px',borderRadius:10}},code),
  plus?R.createElement('span',{style:{background:C.chip2,color:'#6a655c',fontSize:10.5,padding:'3px 6px',borderRadius:10}},plus):null); }
function Cloud(){ return R.createElement('svg',{width:30,height:24,viewBox:'0 0 30 24',fill:'none'},
  R.createElement('path',{d:'M8 18a5 5 0 0 1 .3-9.98A7 7 0 0 1 22 9.2 4.5 4.5 0 0 1 22 18H8Z',stroke:'#4a463f',strokeWidth:1.6,fill:'none'}),
  R.createElement('path',{d:'M15 21V11m0 0-3.2 3.2M15 11l3.2 3.2',stroke:'#4a463f',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round'})); }
function Cursor({x,y,down}){ return R.createElement('div',{style:{position:'absolute',left:x,top:y,transform:`translate(-2px,-2px) scale(${down?0.86:1})`,transition:'transform .08s',zIndex:50,pointerEvents:'none',filter:'drop-shadow(0 2px 3px rgba(0,0,0,.35))'}},
  R.createElement('svg',{width:26,height:26,viewBox:'0 0 24 24'}, R.createElement('path',{d:'M4 2l6.5 16 2.3-6.4L19 9.3 4 2z',fill:'#fff',stroke:'#111',strokeWidth:1.4,strokeLinejoin:'round'}))); }

const h = R.createElement;
const div = (style, ...kids) => h('div', {style}, ...kids);

const ROWS0 = [
  {pn:'PN1234_01', desc:'Compression Spring – Stainless Steel, 1" Length', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-674829','+2'],['Where is this spring intended to be used?','UPS-674829','+2'],['What material is this spring formed from? Please be specific (e.g. if of m…','UPS-482910',null]]},
  {pn:'PN1234_02', desc:'Extension Spring – Zinc-Plated Steel, 2.5"…', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-674829','+2']]},
  {pn:'PN1234_03', desc:'Torsion Spring – Left Hand Wind, Music Wir…', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-903218',null]]},
  {pn:'PN1234_04', desc:'Die Spring – Heavy Duty, Chrome-Silicon,…', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-157483',null]]},
  {pn:'PN1234_05', desc:'Wave Spring – Carbon Steel, 0.5" ID x 0.8" OD', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-582013','+1']]},
  {pn:'PN1234_06', desc:'Constant Force Spring – Stainless Steel, 1 lb…', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?',null,null]]},
  {pn:'PN1234_07', desc:'Belleville Disc Spring – Alloy Steel, 1.25" OD x 0.625" ID', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-908172','+3']]},
];
const ROWSF = [
  {pn:'PN1234_08', desc:'Compression Spring – Stainless Steel, 1" Length', qs:[['Molestiae iste alias incidunt id.','UPS-674829','+2'],['In amet odio ipsam et maxime nostrum incidunt perferendis.','UPS-674829','+2'],['Nihil officiis enim illum beatae.','UPS-482910',null]]},
  {pn:'PN1234_09', desc:'Compression Spring – Stainless Steel, 1" Length', qs:[['In amet odio ipsam et maxime nostrum incidunt perferendis.','UPS-903218',null],['Nihil officiis enim illum beatae.','UPS-157483',null],['Quia est sunt id sit molestias quo adipisci et ullam.','UPS-582013','+1']]},
  {pn:'PN1234_01', desc:'Compression Spring – Stainless Steel, 1" Length', qs:[['What type of spring is this (e.g. leaf, helical, hairspring, etc)?','UPS-908172','+3'],['Where is this spring intended to be used?','UPS-234567',null]]},
];
const PARTS = ['PN1234_01','PN1234_02','PN1234_03','PN1234_04','PN1234_05','PN1234_06','PN1234_07','PN1234_08','PN1234_09','PN1234_10'];

function Scene({t}){
  // camera
  const cx = interp([0,1.6,2.0,3.4,6.0,8.2,11.2,12.7,13.8,16.5],[640,650,650,1010,1010,1010,1010,1010,640,640])(t);
  const cy = interp([0,1.6,2.0,3.4,6.0,8.2,11.2,12.7,13.8,16.5],[360,360,360,250,360,430,430,430,360,360])(t);
  const sc = interp([0,1.6,2.0,3.4,6.0,8.2,11.2,12.7,13.8,15.0,16.5],[1.05,1.08,1.08,1.28,1.42,1.32,1.3,1.3,1.02,1.03,1.0])(t);
  const toScreen = (x,y)=>[640+(x-cx)*sc, 360+(y-cy)*sc];

  const panelIn = interp([2.0,3.2,12.4,13.2],[0,1,1,0])(t);
  const panelX = (1-panelIn)*470;

  const dropOpen = t>3.9 && t<7.7;
  const typed = t<4.9?'':(t<5.0?'1':t<5.15?'12':t<5.3?'123':'1234');
  const showList = dropOpen && t>4.85;
  const sel08 = t>6.35, sel09 = t>7.15;
  const bankOpen = t>8.7;
  const genOpen = t>9.7;
  const genChecked = t>10.7;
  const addReady = sel08 && genChecked;
  const addClicked = t>12.2 && t<12.7;
  const reloading = t>=12.9 && t<13.7;
  const showFinal = t>=13.6;
  const toastIn = interp([13.9,14.5,16.5],[0,1,1],easeOutCubic)(t);

  const cxk=[0.0,1.5,2.0,3.6,4.1,5.6,6.5,7.3,8.9,9.8,10.8,12.0,12.5,13.4,14.2];
  const kx=[720,968,968,1021,1021,900,862,862,900,858,838,1150,1150,1150,1180];
  const ky=[560,150,150,128,128,300,372,398,250,300,300,636,636,500,150];
  const curXapp = interp(cxk,kx)(t), curYapp = interp(cxk,ky)(t);
  const [curSX,curSY] = toScreen(curXapp,curYapp);
  const clickTimes=[1.85,4.0,6.35,7.15,8.7,9.7,10.7,12.35];
  const down = clickTimes.some(ct=>Math.abs(t-ct)<0.12);
  const ripple = clickTimes.find(ct=>t>=ct && t<ct+0.4);

  const caps=[[0,'The Q&A table — one question at a time'],[2.2,'Add questions'],[4.0,'Select multiple parts at once'],[8.7,'Pull from the shared question bank'],[13.9,'8 questions added — without leaving the table']];
  let cap=caps[0][1]; caps.forEach(c=>{if(t>=c[0])cap=c[1];});

  const rowH=34;
  const renderRows=(rows,yStart)=>{
    let y=yStart; const out=[];
    rows.forEach((r,ri)=>{
      const hh=r.qs.length*rowH;
      out.push(div({position:'absolute',left:60,top:y+6,width:150,color:C.link,fontSize:12,fontWeight:500},r.pn));
      out.push(div({position:'absolute',left:190,top:y+6,width:150,color:C.text,fontSize:11.5,lineHeight:1.25},r.desc));
      r.qs.forEach((q,qi)=>{
        const ry=y+qi*rowH;
        out.push(div({position:'absolute',left:44,right:20,top:ry,height:rowH,borderBottom:`1px solid ${C.line}`}));
        out.push(div({position:'absolute',left:330,top:ry+9},h(Kebab)));
        out.push(div({position:'absolute',left:352,top:ry+10},h(Box,{})));
        out.push(div({position:'absolute',left:378,top:ry+7,width:230,color:C.text,fontSize:11.5,lineHeight:1.25},q[0]));
        out.push(div({position:'absolute',left:815,top:ry+7},h(Pill)));
        if(q[1]) out.push(div({position:'absolute',left:920,top:ry+8},h(Req,{code:q[1],plus:q[2]})));
      });
      y+=hh;
      out.push(div({position:'absolute',left:44,right:20,top:y,height:0,borderBottom:`1px solid ${C.line}`}));
    });
    return out.map((el,i)=>R.cloneElement(el,{key:i}));
  };
  const tableRows = showFinal?ROWSF:ROWS0;

  return div({position:'absolute',inset:0,background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",overflow:'hidden'},
    // camera layer
    div({position:'absolute',inset:0,transformOrigin:'0 0',transform:`translate(${640-cx*sc}px,${360-cy*sc}px) scale(${sc})`},
      div({position:'absolute',left:WX,top:WY,width:WW,height:WH,background:C.win,borderRadius:8,border:`1px solid ${C.border}`,boxShadow:'0 24px 60px rgba(20,18,15,.20)',overflow:'hidden'},
        // sidebar
        div({position:'absolute',left:0,top:0,width:44,height:'100%',background:C.navy,display:'flex',flexDirection:'column',alignItems:'center',paddingTop:10,gap:15,borderRadius:'8px 0 0 8px'},
          div({width:22,height:22,borderRadius:'50%',border:'2px solid #7fb0c9',marginBottom:4}),
          ...[0,1,2,3,4,5].map((i)=>div({width:24,height:24,borderRadius:5,background:i===3?C.orange:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}, div({width:12,height:12,border:'1.6px solid #cdd7de',borderRadius:3,opacity:i===3?0:.85})))
        ),
        // topbar
        div({position:'absolute',left:44,right:0,top:0,height:40,borderBottom:`1px solid ${C.line}`,display:'flex',alignItems:'center',padding:'0 16px',justifyContent:'space-between'},
          div({display:'flex',alignItems:'center',gap:7,border:`1px solid ${C.field}`,borderRadius:5,padding:'5px 11px',fontSize:12,color:C.text},'Copper Sports ',h('span',{style:{color:C.mut}},'▾')),
          div({width:22,height:22,borderRadius:'50%',background:'#cbd5dc'})
        ),
        // Q&A header
        div({position:'absolute',left:60,top:58,fontFamily:'Georgia,serif',fontWeight:700,fontSize:22,color:'#1a1a1a'},'Q&A'),
        div({position:'absolute',right:20,top:56,display:'flex',alignItems:'center'},
          div({background:C.orange,color:'#fff',fontSize:12,fontWeight:600,padding:'7px 14px',borderRadius:'5px 0 0 5px'},'Primary Action'),
          div({background:C.orange,color:'#fff',fontSize:12,padding:'7px 8px',borderLeft:'1px solid rgba(255,255,255,.3)',borderRadius:'0 5px 5px 0'},'▾')
        ),
        // toolbar
        div({position:'absolute',left:60,top:130,display:'flex',alignItems:'center'},
          div({display:'flex',alignItems:'center',gap:6,border:`1px solid ${C.field}`,borderRadius:6,padding:'6px 12px',width:200,color:C.mut,fontSize:12},'⌕ Search'),
          h('span',{style:{marginLeft:10,color:C.head,fontSize:12}},'✕ Clear')
        ),
        div({position:'absolute',right:20,top:132,display:'flex',alignItems:'center',gap:20,color:C.head,fontSize:12},
          h('span',null,'+ Add'),h('span',null,'⬇ Import'),h('span',null,'⬆ Export'),h('span',null,'▽ Filter')
        ),
        // table header
        div({position:'absolute',left:44,right:20,top:168,height:22,borderBottom:`1px solid ${C.line}`}),
        div({position:'absolute',left:60,top:170,color:C.head,fontSize:11,fontWeight:600},'Part Number'),
        div({position:'absolute',left:190,top:170,color:C.head,fontSize:11,fontWeight:600},'Part Description'),
        div({position:'absolute',left:330,top:170,color:C.head,fontSize:11},'⚙'),
        div({position:'absolute',left:352,top:170},h(Box,{})),
        div({position:'absolute',left:378,top:170,color:C.head,fontSize:11,fontWeight:600},'Question',h('span',{style:{color:C.orange}},'*')),
        div({position:'absolute',left:628,top:170,color:C.head,fontSize:11,fontWeight:600},'Answer'),
        div({position:'absolute',left:770,top:170,color:C.head,fontSize:11,fontWeight:600},'Attachments'),
        div({position:'absolute',left:815,top:170,color:C.head,fontSize:11,fontWeight:600},'Status'),
        div({position:'absolute',left:920,top:170,color:C.head,fontSize:11,fontWeight:600},'Requests'),
        ...renderRows(tableRows,190),
        // spinner
        reloading?div({position:'absolute',left:'50%',top:'54%',width:44,height:44,marginLeft:-22,border:`4px solid ${C.chip}`,borderTopColor:C.orange,borderRadius:'50%',transform:`rotate(${t*720}deg)`}):null,
        // toast
        showFinal?div({position:'absolute',right:20,top:48,display:'flex',alignItems:'center',gap:8,background:C.green,color:'#fff',fontSize:12,fontWeight:600,padding:'8px 14px',borderRadius:6,opacity:toastIn,transform:`translateY(${(1-toastIn)*-8}px)`,boxShadow:'0 8px 20px rgba(47,158,79,.3)'},h('span',{style:{fontSize:13}},'✓'),' 8 questions added successfully'):null,

        // ===== PANEL =====
        panelIn>0.01?div({position:'absolute',left:PL,top:0,width:WW-PL,height:'100%',background:'#fff',boxShadow:'-18px 0 40px rgba(20,18,15,.10)',transform:`translateX(${panelX}px)`,borderLeft:`1px solid ${C.line}`},
          div({position:'absolute',left:18,top:16,fontFamily:'Georgia,serif',fontWeight:700,fontSize:16,color:'#1a1a1a'},'Add Questions'),
          div({position:'absolute',right:16,top:16,color:C.mut,fontSize:15},'✕'),
          div({position:'absolute',left:18,top:48,color:C.mut,fontSize:11.5},'Select one or more parts'),
          // select field
          div({position:'absolute',left:16,right:16,top:66,minHeight:34,border:`1.5px solid ${dropOpen?C.orange:C.field}`,borderRadius:6,display:'flex',alignItems:'center',gap:6,padding:'0 30px 0 10px',flexWrap:'wrap'},
            sel08?h('span',{style:{background:C.chip,fontSize:11,padding:'3px 7px',borderRadius:4,display:'inline-flex',gap:4}},'PN1234_08 ',h('span',{style:{color:C.mut}},'✕')):null,
            sel09?h('span',{style:{background:C.chip,fontSize:11,padding:'3px 7px',borderRadius:4,display:'inline-flex',gap:4}},'PN1234_09 ',h('span',{style:{color:C.mut}},'✕')):null,
            h('span',{style:{fontSize:12,color:(sel08||typed)?C.text:C.mut}}, typed||(sel08?'':'Select Parts*'), dropOpen?h('span',{style:{opacity:t%1<0.5?1:0.2}},'|'):null),
            h('span',{style:{position:'absolute',right:10,color:C.mut,fontSize:10}}, dropOpen?'▲':'▼')
          ),
          // dropdown
          dropOpen?div({position:'absolute',left:16,right:16,top:104,maxHeight:showList?300:44,background:'#fff',border:`1px solid ${C.line}`,borderRadius:6,boxShadow:'0 12px 28px rgba(20,18,15,.14)',overflow:'hidden',zIndex:5},
            !showList?div({padding:'12px',color:C.mut,fontSize:12},'Enter at least 3 characters'):null,
            showList?PARTS.map((p,i)=>{
              const hi=(p==='PN1234_08'&&t>6.1&&t<6.6)||(p==='PN1234_09'&&t>6.9&&t<7.4);
              const done=(p==='PN1234_08'&&sel08)||(p==='PN1234_09'&&sel09);
              return div({key:p,padding:'6px 12px',fontSize:12,color:C.text,background:(hi||done)?'#f1efec':'#fff'},p);
            }):null
          ):null,
          // bank + attachments (when dropdown closed)
          !dropOpen?div({position:'absolute',left:0,right:0,top:0,bottom:0},
            div({position:'absolute',left:18,top:112,color:C.mut,fontSize:11.5},'Select questions from the bank or add custom questions'),
            div({position:'absolute',left:16,right:16,top:132},
              div({display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'Georgia,serif',fontWeight:700,fontSize:15,color:'#1a1a1a',paddingBottom:8},'Questions Bank ',h('span',{style:{color:C.mut,fontSize:11,fontFamily:'Inter'}}, bankOpen?'▲':'▼')),
              bankOpen?div({marginTop:2},
                div({display:'flex',alignItems:'center',gap:6,border:`1px solid ${C.field}`,borderRadius:6,padding:'7px 10px',color:C.mut,fontSize:11.5,marginBottom:8},'⌕ Search'),
                div({display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 2px'},
                  div({display:'flex',alignItems:'center',gap:9},h(Box,{on:genChecked}),h('span',{style:{fontSize:12.5,color:C.text}},'General')),
                  h('span',{style:{color:C.mut,fontSize:10}}, genOpen?'▲':'▼')
                ),
                genOpen?['Molestiae iste alias incidunt id.','In amet odio ipsam et maxime nostrum incidunt perferendis.','Nihil officiis enim illum beatae.','Quia est sunt id sit molestias quo adipisci et ullam.'].map((q,i)=>
                  div({key:i,display:'flex',alignItems:'flex-start',gap:9,padding:'6px 2px 6px 22px'},h(Box,{on:genChecked}),h('span',{style:{fontSize:11.5,color:C.text,lineHeight:1.3,flex:1,minWidth:0}},q))):null,
                ...['Category 2','Category 3','Category 4','Category 5','Category 6'].map((c)=>
                  div({key:c,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 2px'},
                    div({display:'flex',alignItems:'center',gap:9},h(Box,{}),h('span',{style:{fontSize:12.5,color:C.text}},c)),
                    h('span',{style:{color:C.mut,fontSize:10}},'▼'))),
                div({textAlign:'center',color:C.orange,fontSize:12,fontWeight:600,padding:'9px 0',borderTop:`1px solid ${C.line}`,borderBottom:`1px solid ${C.line}`,marginTop:4},'+ Add Question')
              ):div({textAlign:'center',color:C.orange,fontSize:12,fontWeight:600,padding:'9px 0',borderTop:`1px solid ${C.line}`,borderBottom:`1px solid ${C.line}`},'+ Add Question')
            ),
            !bankOpen?div({position:'absolute',left:0,right:0,top:0,bottom:0},
              div({position:'absolute',left:18,top:196,color:C.mut,fontSize:11.5},'Add Attachments'),
              div({position:'absolute',left:16,right:16,top:214,height:150,border:`1.5px dashed ${C.field}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8},
                h(Cloud),
                div({fontWeight:700,fontSize:12.5,color:'#2a2722'},'Drag and drop file here'),
                div({color:C.mut,fontSize:12},'or'),
                div({border:`1px solid ${C.field}`,borderRadius:5,padding:'6px 14px',fontSize:12,color:C.text},'Browse Files')
              )
            ):null
          ):null,
          // footer
          div({position:'absolute',left:0,right:0,bottom:0,height:44,borderTop:`1px solid ${C.line}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',background:'#fff'},
            h('span',{style:{color:C.mut,fontSize:12.5}},'Cancel'),
            h('span',{style:{background:addReady?C.orange:'#eceae6',color:addReady?'#fff':'#b7b2a8',fontSize:12.5,fontWeight:600,padding:'7px 18px',borderRadius:5,transform:addClicked?'scale(.94)':'scale(1)',transition:'transform .1s'}},'Add')
          )
        ):null
      )
    ),
    // ripple
    ripple!=null?div({position:'absolute',left:curSX,top:curSY,width:8,height:8,marginLeft:-4,marginTop:-4,borderRadius:'50%',border:`2px solid ${C.orange}`,transform:`scale(${1+(t-ripple)*10})`,opacity:Math.max(0,1-(t-ripple)*2.5),zIndex:49,pointerEvents:'none'}):null,
    // cursor
    h(Cursor,{x:curSX,y:curSY,down}),
    // caption
    div({position:'absolute',left:0,right:0,bottom:22,display:'flex',justifyContent:'center',zIndex:60},
      div({background:'rgba(20,18,15,.82)',color:'#fff',fontFamily:"'Inter',sans-serif",fontSize:14,padding:'9px 20px',borderRadius:30},cap)
    )
  );
}

function QAWalkthrough(){
  const [t,setT] = useState(0);
  const [scale,setScale] = useState(1);
  const wrapRef = useRef(null);
  const raf = useRef(0), t0 = useRef(0), paused = useRef(0), visible = useRef(true);
  const reduce = typeof window!=='undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(()=>{
    if(reduce){ setT(14.4); return; }   // reduced motion: hold on the success frame, no looping
    let acc=0, last=0;
    const loop=(ts)=>{ raf.current=requestAnimationFrame(loop);
      if(!last)last=ts;
      const dt=ts-last; last=ts;
      if(visible.current){ acc=(acc+dt/1000)%DUR; setT(acc); }
    };
    raf.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(raf.current);
  },[]);
  useEffect(()=>{                        // autoplay only while in viewport
    if(reduce || !wrapRef.current || !window.IntersectionObserver) return;
    const io=new IntersectionObserver((es)=>{ visible.current = es[0].isIntersecting; }, {threshold:0.25});
    io.observe(wrapRef.current);
    return ()=>io.disconnect();
  },[]);
  useEffect(()=>{
    const fit=()=>{ const el=wrapRef.current; const w=(el&&el.clientWidth)||window.innerWidth, hh=(el&&el.clientHeight)||window.innerHeight; setScale(Math.min(w/1280, hh/720)); };
    fit();
    let ro=null;
    if(window.ResizeObserver && wrapRef.current){ ro=new ResizeObserver(fit); ro.observe(wrapRef.current); }
    window.addEventListener('resize',fit);
    return ()=>{ if(ro)ro.disconnect(); window.removeEventListener('resize',fit); };
  },[]);
  const prog = t/DUR;
  return h('div',{ref:wrapRef,style:{position:'absolute',inset:0,background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}},
    div({width:1280,height:720,transform:`scale(${scale})`,transformOrigin:'center',position:'relative',flexShrink:0},
      h(Scene,{t}),
      div({position:'absolute',left:0,bottom:0,height:3,width:`${prog*100}%`,background:C.orange,opacity:.9,zIndex:70})
    )
  );
}
window.QAWalkthrough = QAWalkthrough;