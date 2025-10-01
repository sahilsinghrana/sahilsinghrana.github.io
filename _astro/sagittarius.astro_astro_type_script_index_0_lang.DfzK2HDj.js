class p{constructor(o={}){this.config={constellationName:o.constellationName||"Constellation",starData:o.starData||{},coordinateData:o.coordinateData||{ra:{value:"RA: 00h 00m",description:"Right Ascension coordinates for this constellation"},dec:{value:"Dec: +00°",description:"Declination coordinates for this constellation"}},astronomicalFacts:o.astronomicalFacts||[],starfieldCount:o.starfieldCount||150,enableMouseTrail:o.enableMouseTrail!==!1,enableTypingEffect:o.enableTypingEffect!==!1,enableParallax:o.enableParallax!==!1,...o},this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.initializeAll()):this.initializeAll()}initializeAll(){this.createStarfield(),this.initConstellationInteractions(),this.initConstellationDrawing(),this.initNebulaInteractions(),this.initFactCardInteractions(),this.initCoordinateInteractions(),this.initScrollAnimations(),this.config.enableParallax&&this.initParallax(),this.config.enableTypingEffect&&this.initTypingEffect(),this.config.enableMouseTrail&&this.initMouseTrail(),this.initStarGlowEffects(),this.showInstructionTooltip()}createStarfield(){const o=document.querySelector(".constellation-starfield");if(o)for(let t=0;t<this.config.starfieldCount;t++){const a=document.createElement("div");a.className="star-point";const e=Math.random();let n,i;e<.7?(n=Math.random()*1.5+.5,i=Math.random()*.6+.3):e<.9?(n=Math.random()*2+1.5,i=Math.random()*.8+.4):(n=Math.random()*3+2,i=Math.random()*.9+.5),a.style.cssText=`
        position: absolute;
        width: ${n}px;
        height: ${n}px;
        background: white;
        border-radius: 50%;
        top: ${Math.random()*100}%;
        left: ${Math.random()*100}%;
        opacity: ${i};
        animation: constellation-twinkle ${Math.random()*4+2}s infinite ease-in-out;
        animation-delay: ${Math.random()*3}s;
        box-shadow: 0 0 ${n}px rgba(255, 255, 255, 0.3);
      `,o.appendChild(a)}}initConstellationInteractions(){document.querySelectorAll(".constellation-star").forEach(t=>{t.addEventListener("mouseenter",a=>this.showStarTooltip(a.target)),t.addEventListener("mouseleave",()=>this.hideStarTooltip()),t.addEventListener("click",a=>this.showStarInfo(a.target))})}showStarTooltip(o){const t=o.getAttribute("data-name");if(!t)return;let a=document.querySelector(".constellation-star-tooltip");a||(a=document.createElement("div"),a.className="constellation-star-tooltip",a.style.cssText=`
        position: absolute;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        border: 1px solid rgba(74, 158, 255, 0.5);
        font-family: 'Courier New', monospace;
      `,document.body.appendChild(a)),a.textContent=t,a.style.display="block";const e=o.getBoundingClientRect();a.style.left=e.left+e.width/2-a.offsetWidth/2+"px",a.style.top=e.top-a.offsetHeight-10+"px"}hideStarTooltip(){const o=document.querySelector(".constellation-star-tooltip");o&&(o.style.display="none")}showStarInfo(o){const t=o.getAttribute("data-name");if(!t)return;const a=this.config.starData[t]||`A beautiful star in the ${this.config.constellationName} constellation.`;let e=document.querySelector(".constellation-star-info-panel");e||(e=document.createElement("div"),e.className="constellation-star-info-panel",e.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 300px;
        border: 1px solid rgba(74, 158, 255, 0.3);
        z-index: 1000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        font-family: 'Courier New', monospace;
      `,document.body.appendChild(e)),e.innerHTML=`
      <h3 style="color: #4a9eff; margin-bottom: 10px;">${t}</h3>
      <p style="line-height: 1.5; font-size: 14px;">${a}</p>
      <button onclick="this.parentElement.style.transform='translateY(100px)'; this.parentElement.style.opacity='0';" 
              style="margin-top: 15px; background: transparent; border: 1px solid #4a9eff; color: #4a9eff; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-family: inherit;">
          Close
      </button>
    `,setTimeout(()=>{e.style.transform="translateY(0)",e.style.opacity="1"},100)}initConstellationDrawing(){const o=document.querySelectorAll(".constellation-lines line");if(o.length===0)return;o.forEach(s=>{const c=s.getTotalLength();s.style.strokeDasharray=c,s.style.strokeDashoffset="0",s.style.transition="stroke-dashoffset 0.8s ease"});const t=document.createElement("button");t.className="constellation-toggle-btn",t.style.cssText=`
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(74, 158, 255, 0.2);
      border: 1px solid #4a9eff;
      color: #4a9eff;
      padding: 0.8rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      z-index: 100;
    `;const a=document.querySelector(".constellation-hero");a&&a.appendChild(t);let e=2,n=null;const i=()=>{switch(e){case 0:t.textContent="Draw Lines";break;case 1:t.textContent="Animate Lines";break;case 2:t.textContent="Hide Lines";break}},r=()=>{n&&(clearInterval(n),n=null),o.forEach(s=>{s.style.strokeDashoffset=s.getTotalLength()})},l=()=>{n&&(clearInterval(n),n=null),o.forEach((s,c)=>{setTimeout(()=>{s.style.strokeDashoffset="0"},c*200)})},d=()=>{n&&clearInterval(n);let s=!0;const c=()=>{s?o.forEach((u,f)=>{setTimeout(()=>{u.style.strokeDashoffset="0"},f*150)}):o.forEach((u,f)=>{setTimeout(()=>{u.style.strokeDashoffset=u.getTotalLength()},f*150)}),s=!s};c(),n=setInterval(c,3e3)};i(),d(),t.addEventListener("click",()=>{switch(e=(e+1)%3,i(),e){case 0:r();break;case 1:l();break;case 2:d();break}}),t.addEventListener("mouseenter",function(){this.style.background="rgba(74, 158, 255, 0.3)",this.style.transform="scale(1.05)"}),t.addEventListener("mouseleave",function(){this.style.background="rgba(74, 158, 255, 0.2)",this.style.transform="scale(1)"})}initNebulaInteractions(o=document.body){const t=/\b(nebula(?:e|s)?)\b/gi,a=document.createTreeWalker(o,NodeFilter.SHOW_TEXT,{acceptNode(i){const r=i.nodeValue;if(!r||!r.trim())return NodeFilter.FILTER_REJECT;const l=i.parentNode;return!l||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|IFRAME)$/i.test(l.nodeName)?NodeFilter.FILTER_REJECT:r.toLowerCase().includes("nebula")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}},!1),e=[];let n;for(;n=a.nextNode();)e.push(n);if(e.forEach(i=>{const r=i.nodeValue,l=r.replace(t,'<span class="nebula-hover" title="A nebula is a giant cloud of dust and gas in space, often where stars are born or die">$1</span>');if(l===r)return;const d=document.createElement("span");d.innerHTML=l;const s=document.createDocumentFragment();for(;d.firstChild;)s.appendChild(d.firstChild);i.parentNode.replaceChild(s,i)}),!document.getElementById("nebula-hover-style")){const i=document.createElement("style");i.id="nebula-hover-style",i.textContent=`
      .nebula-hover {
        border-bottom: 1px dotted #4a9eff;
        cursor: help;
        position: relative;
      }
      .nebula-hover:hover {
        color: #4a9eff;
      }
    `,document.head.appendChild(i)}}getTextNodes(o){const t=[],a=document.createTreeWalker(o,NodeFilter.SHOW_TEXT,null,!1);let e;for(;e=a.nextNode();)e.textContent.trim()&&t.push(e);return t}initFactCardInteractions(){document.querySelectorAll(".constellation-fact-card").forEach(t=>{t.addEventListener("mouseenter",function(){this.style.transform="translateY(-5px)",this.style.boxShadow="0 10px 30px rgba(74, 158, 255, 0.2)"}),t.addEventListener("mouseleave",function(){this.style.transform="translateY(0)",this.style.boxShadow="none"})})}initCoordinateInteractions(){const o=document.querySelector(".constellation-coordinates");if(!o)return;o.querySelectorAll("span").forEach(a=>{a.style.cursor="pointer",a.style.transition="all 0.3s ease",a.addEventListener("click",e=>{const n=e.target.textContent;this.showCoordinateCard(n,e.target)}),a.addEventListener("mouseenter",function(){this.style.color="#4a9eff",this.style.textShadow="0 0 10px rgba(74, 158, 255, 0.5)"}),a.addEventListener("mouseleave",function(){this.style.color="",this.style.textShadow=""})})}showCoordinateCard(o,t){const a=document.querySelector(".coordinate-info-card");a&&a.remove();const e=document.createElement("div");e.className="coordinate-info-card";let n,i,r="";o.includes("RA:")?(n="Right Ascension (RA)",this.config.constellationName==="Sagittarius"&&(r=`
          <div class="coordinate-specific-info">
            <h4>Sagittarius RA Range</h4>
            <p>Sagittarius spans from approximately 18h to 20h in Right Ascension, making it visible during summer months in the Northern Hemisphere.</p>
            <p><strong>Best Viewing:</strong> July-August around midnight</p>
          </div>
        `),i=`
        <p><strong>Current Value:</strong> ${o}</p>
        <p>Right Ascension is like longitude on Earth's surface, but projected onto the celestial sphere. It's measured in hours, minutes, and seconds (24 hours = 360°).</p>
        <p><strong>Educational Note:</strong> RA coordinates help astronomers locate objects in the sky. This measurement remains relatively constant as it's tied to distant stars.</p>
        ${r}
      `):o.includes("Dec:")&&(n="Declination (Dec)",this.config.constellationName==="Sagittarius"&&(r=`
          <div class="coordinate-specific-info">
            <h4>Sagittarius Dec Range</h4>
            <p>Sagittarius ranges from approximately -45° to -12° in Declination, placing it in the southern celestial hemisphere.</p>
            <p><strong>Visibility:</strong> Best seen from southern latitudes, partially visible from northern locations</p>
          </div>
        `),i=`
        <p><strong>Current Value:</strong> ${o}</p>
        <p>Declination is like latitude on Earth's surface, but projected onto the celestial sphere. It's measured in degrees from the celestial equator.</p>
        <p><strong>Educational Note:</strong> Positive declination means the object is north of the celestial equator, negative means south. This helps determine visibility from different locations on Earth.</p>
        ${r}
      `),e.innerHTML=`
      <div class="coordinate-card-header">
        <h3>${n}</h3>
        <button class="coordinate-card-close">&times;</button>
      </div>
      <div class="coordinate-card-content">
        ${i}
      </div>
    `,e.style.cssText=`
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(74, 158, 255, 0.3);
      border-radius: 12px;
      padding: 0;
      max-width: 400px;
      width: 90%;
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
      font-family: 'Courier New', monospace;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;const l=document.createElement("style");l.textContent=`
      .coordinate-card-header {
        background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.1));
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(74, 158, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 12px 12px 0 0;
      }
      .coordinate-card-header h3 {
        color: #4a9eff;
        margin: 0;
        font-size: 1.2rem;
      }
      .coordinate-card-close {
        background: none;
        border: none;
        color: #4a9eff;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      .coordinate-card-close:hover {
        background: rgba(74, 158, 255, 0.2);
        transform: scale(1.1);
      }
      .coordinate-card-content {
        padding: 1.5rem;
        color: #e0e0e0;
        line-height: 1.6;
      }
      .coordinate-card-content p {
        margin-bottom: 1rem;
      }
      .coordinate-card-content strong {
        color: #4a9eff;
      }
      .coordinate-specific-info {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(74, 158, 255, 0.05);
        border-left: 3px solid #4a9eff;
        border-radius: 0 8px 8px 0;
      }
      .coordinate-specific-info h4 {
        color: #4a9eff;
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
      }
      .coordinate-specific-info p {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }
    `,document.head.appendChild(l),document.body.appendChild(e),setTimeout(()=>{e.style.opacity="1",e.style.transform="translate(-50%, -50%) scale(1)"},10);const d=e.querySelector(".coordinate-card-close"),s=()=>{e.style.opacity="0",e.style.transform="translate(-50%, -50%) scale(0.8)",setTimeout(()=>e.remove(),300)};d.addEventListener("click",s),document.addEventListener("click",function c(u){!e.contains(u.target)&&!t.contains(u.target)&&(s(),document.removeEventListener("click",c))}),document.addEventListener("keydown",function c(u){u.key==="Escape"&&(s(),document.removeEventListener("keydown",c))})}initScrollAnimations(){const o={threshold:.1,rootMargin:"0px 0px -50px 0px"},t=new IntersectionObserver(e=>{e.forEach(n=>{n.isIntersecting&&(n.target.style.opacity="1",n.target.style.transform="translateY(0)")})},o);document.querySelectorAll(".constellation-fact-card, .constellation-nebula-item, .constellation-culture-item").forEach(e=>{e.style.opacity="0",e.style.transform="translateY(30px)",e.style.transition="all 0.6s ease",t.observe(e)})}initParallax(){window.addEventListener("scroll",()=>{const o=window.pageYOffset;document.querySelectorAll(".constellation-starfield").forEach(a=>{a.style.transform=`translateY(${o*.5}px)`})})}initTypingEffect(){document.querySelectorAll(".constellation-subtitle").forEach(t=>{const a=t.textContent;t.textContent="",t.style.borderRight="2px solid #4a9eff";let e=0;const n=()=>{e<a.length?(t.textContent+=a.charAt(e),e++,setTimeout(n,100)):setTimeout(()=>{t.style.borderRight="none"},1e3)};setTimeout(n,1e3)})}initMouseTrail(){}updateTrail(o){let t=document.querySelector(".mouse-trail-container");t||(t=document.createElement("div"),t.className="mouse-trail-container",t.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 9999;
        width: 100%;
        height: 100%;
      `,document.body.appendChild(t)),t.innerHTML="",o.forEach((a,e)=>{const n=document.createElement("div"),i=(e+1)/o.length*.5,r=(e+1)/o.length*4;n.style.cssText=`
        position: absolute;
        width: ${r}px;
        height: ${r}px;
        background: rgba(74, 158, 255, ${i});
        border-radius: 50%;
        left: ${a.x-r/2}px;
        top: ${a.y-r/2}px;
        transition: opacity 0.3s ease;
      `,t.appendChild(n)})}initStarGlowEffects(){document.querySelectorAll(".constellation-star").forEach(t=>{t.addEventListener("mouseenter",function(){this.style.filter="drop-shadow(0 0 10px #4a9eff)"}),t.addEventListener("mouseleave",function(){this.style.filter=""})})}showInstructionTooltip(){}static createConstellationConfig(o,t={}){return{constellationName:o,starData:t.starData||{},coordinateData:{ra:{value:t.ra||"RA: 00h 00m",description:t.raDescription||`Right Ascension coordinates for ${o}`},dec:{value:t.dec||"Dec: +00°",description:t.decDescription||`Declination coordinates for ${o}`}},astronomicalFacts:t.astronomicalFacts||[],enableMouseTrail:t.enableMouseTrail!==!1,enableTypingEffect:t.enableTypingEffect!==!1,enableParallax:t.enableParallax!==!1,starfieldCount:t.starfieldCount||150}}static addNebulaTooltips(o){const a=o||"A nebula is a giant cloud of dust and gas in space, often where stars are born or die";if(!document.getElementById("nebula-tooltip-style")){const e=document.createElement("style");e.id="nebula-tooltip-style",e.textContent=`
      .nebula-hover {
        border-bottom: 1px dotted #4a9eff;
        cursor: help;
        position: relative;
      }
      .nebula-hover::after {
        content: attr(data-nebula-tooltip);
        display: inline-block;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: normal;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 1000;
        border: 1px solid rgba(74, 158, 255, 0.3);
        max-width: 300px;
        box-sizing: border-box;
      }
      .nebula-hover:hover::after,
      .nebula-hover:focus::after {
        opacity: 1;
      }
    `,document.head.appendChild(e)}document.querySelectorAll(".nebula-hover").forEach(e=>{e.hasAttribute("data-nebula-tooltip")||e.setAttribute("data-nebula-tooltip",a),e.getAttribute("title")||e.setAttribute("title",a)})}}try{const h=p.createConstellationConfig("Sagittarius",{ra:"RA: 19h 00m",dec:"Dec: -25°",raDescription:"Right Ascension coordinates for Sagittarius constellation center",decDescription:"Declination coordinates for Sagittarius constellation center",starData:{"Kaus Australis":"The brightest star in Sagittarius, a blue giant star 145 light-years away.","Kaus Media":'An orange giant star, part of the "bow" of the archer.',"Kaus Borealis":"An orange supergiant, completing the archer's bow.",Nunki:"The second brightest star, a hot blue star 228 light-years away.",Ascella:"A close binary star system in the archer's arm.",Shaula:"A blue supergiant, one of the hottest stars visible to the naked eye.",Nash:"A red giant star in the archer's body.",Albaldah:"An orange giant star marking the archer's knee."},enableTypingEffect:!0,enableMouseTrail:!0,enableParallax:!0});new p(h),p.addNebulaTooltips("A nebula is a giant cloud of dust and gas in space where stars are born, live, and die. Sagittarius contains some of the most spectacular nebulae visible from Earth.")}catch(h){console.error("Error initializing Sagittarius constellation:",h)}
