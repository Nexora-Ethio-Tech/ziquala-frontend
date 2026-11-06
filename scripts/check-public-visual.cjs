const fs = require('node:fs');
const path = require('node:path');
module.exports = async ({send,evaluate,until,navigate,origin,audit}) => {
  const output = process.env.VISUAL_CHECK_DIR || 'C:/Ziquala/step11-visual';
  fs.mkdirSync(output,{recursive:true});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.navigate',{url:origin+'/'});
  await until("!!document.querySelector('main h1')",'visual initial page');
  const results=[];
  const routes=process.env.VISUAL_ROUTES ? JSON.parse(process.env.VISUAL_ROUTES) : ['/','/school','/monastery','/elearning','/news','/contact','/portal','/login','/register'];
  const capture=async name=>{
    const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const file=path.join(output,name+'.png');fs.writeFileSync(file,Buffer.from(result.data,'base64'));return file;
  };
  if(!process.env.VISUAL_DETAILS_ONLY) for(const width of [320,390,768,1024,1440]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    for(const language of ['en','am','om']) {
      for(const theme of ['light','dark']) {
        await evaluate(`document.documentElement.classList.toggle('dark',${theme==='dark'});document.documentElement.style.colorScheme=${JSON.stringify(theme)};`);
        for(const route of routes) {
          await navigate(route);
          await until("!!document.querySelector('h1')",route+' heading');
          await evaluate(`(()=>{const s=document.querySelector('select:has(option[value=am])');if(s){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(language)});s.dispatchEvent(new Event('change',{bubbles:true}));}else{localStorage.setItem('ziquala_language',${JSON.stringify(language)});dispatchEvent(new StorageEvent('storage',{key:'ziquala_language',newValue:${JSON.stringify(language)}}));}})()`);
          await until(`document.documentElement.lang === ${JSON.stringify(language)}`,'language settled');
          await new Promise(r=>setTimeout(r,100));
          await evaluate('scrollTo(0,0)');
          const measurements=await evaluate(`(()=>{
            const width=innerWidth;
            const visible=el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!el.closest('[inert]')};
            const clipped=Array.from(document.querySelectorAll('header a,header button,header select,main a,main input,main select,main textarea,main button,main h1')).filter(visible).flatMap(el=>{
              const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return [];
              return r.left < -1||r.right>width+1?[{tag:el.tagName,text:el.textContent.trim().slice(0,70),left:r.left,right:r.right}]:[];
            });
            const filter=document.querySelector('main input')?.parentElement?.parentElement;
            const filterStyle=filter&&getComputedStyle(filter);
            const headerHeight=document.querySelector('header')?.getBoundingClientRect().height||0;
            if(location.pathname==='/elearning'&&filterStyle?.position==='sticky'&&parseFloat(filterStyle.top)<headerHeight)clipped.push({reason:'Library filters overlap the header',top:filterStyle.top,headerHeight});
            return {viewport:width,pageWidth:document.documentElement.scrollWidth,clipped,heading:document.querySelector('h1').textContent,brokenImages:Array.from(document.images).filter(i=>i.complete&&i.naturalWidth===0&&i.getBoundingClientRect().width>0&&i.getBoundingClientRect().top<900).map(i=>i.getAttribute('src'))};
          })()`);
          let screenshot;
          if((language==='en' && theme==='dark' && [390,1440].includes(width)) || (width===320 && route==='/' && theme==='light')) screenshot=await capture(`${width}-${route.slice(1)||'home'}-${theme}-${language}`);
          results.push({width,language,theme,route,...measurements,...(screenshot?{screenshot}:{})});
          if(route==='/elearning'&&width===390&&language==='en')await audit('visual-library-'+theme);
        }
      }
    }
    console.log(`VISUAL ${width}px: ${routes.length} routes, 3 languages, both themes`);
  }
  const overlays=[];
  for(const [width,height] of [[320,568],[390,700],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await navigate('/elearning?book=loading-check-book');
    await until("!!document.querySelector('dialog[open]')",'reader overlay');
    const reader=await evaluate(`(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect(),b=d.querySelector('header button').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,closeVisible:b.top>=0&&b.bottom<=innerHeight&&b.right<=innerWidth}})()`);
    overlays.push({width,height,type:'reader',...reader,screenshot:await capture(`${width}x${height}-reader`)});
    await evaluate("document.querySelector('dialog[open] header button').click()");
    await until("!document.querySelector('dialog[open]')",'reader closed');
    await navigate('/');await until("!!document.querySelector('header')",'home header');
    if(width<768){
      await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
      await until("!!document.getElementById('public-navigation-menu')",'menu overlay');
      await until("Number(getComputedStyle(document.getElementById('public-navigation-menu')).opacity) > .999",'menu animation finished');
      const menu=await evaluate(`(()=>{const m=document.getElementById('public-navigation-menu'),r=m.getBoundingClientRect(),chat=document.querySelector('[data-school-chat-launcher]');return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,scrollable:m.scrollHeight>=m.clientHeight,chatHidden:!chat||getComputedStyle(chat).visibility==='hidden'}})()`);
      overlays.push({width,height,type:'menu',...menu,screenshot:await capture(`${width}x${height}-menu`)});
      await evaluate("document.querySelector('header button[aria-controls=public-navigation-menu]').click()");
      await until("!document.getElementById('public-navigation-menu')",'menu closed');
    }
  }
  const details=[];
  for(const width of [390,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    for(const [route,selector] of [['/school','#school-campuses'],['/school','#school-leadership'],['/elearning','main input'],['/contact','main form'],['/','footer']]){
      await navigate(route);await until(`!!document.querySelector(${JSON.stringify(selector)})`,'detail ready');
      await new Promise(r=>setTimeout(r,300));
      await evaluate("dispatchEvent(new WheelEvent('wheel',{deltaY:1}))");
      // Lazy images above the target may expand while a long page is scrolled.
      for(let settle=0;settle<6;settle++){
        await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),header=document.querySelector('header');scrollTo({top:scrollY+e.getBoundingClientRect().top-(header?.getBoundingClientRect().height||0)-16,behavior:'instant'})})()`);
        await new Promise(r=>setTimeout(r,250));
      }
      await until(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()`,'detail within viewport '+selector);
      await new Promise(r=>setTimeout(r,800));
      details.push({width,route,selector,screenshot:await capture(`${width}-detail-${selector.replace(/[^a-z]/gi,'-')}`)});
    }
  }
  fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify({results,overlays,details},null,2));
  const issues=results.filter(r=>r.pageWidth>r.viewport+1||r.clipped.length||r.brokenImages.length);
  console.log(JSON.stringify({states:results.length,issues},null,2));
  for(const overlay of overlays)if(overlay.left < -1||overlay.right>overlay.width+1||overlay.top < -1||overlay.bottom>overlay.height+1||overlay.closeVisible===false||overlay.chatHidden===false)issues.push(overlay);
  return {states:results.length,issues,results,overlays,details};
};
