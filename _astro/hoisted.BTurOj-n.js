import"./hoisted.3Fvt2Lfv.js";const v={topSpotifySongsAndTracks:"https://mytopsongs.sahilsinghrana.workers.dev/",currentPlayerStatus:"https://mytopsongs.sahilsinghrana.workers.dev/currentPlaying"};async function k(){return fetch(v.currentPlayerStatus).then(t=>t.json())}async function x(){return fetch(v.topSpotifySongsAndTracks).then(t=>t.json())}class F{static createArtistCard(e={}){const{images:n,external_urls:a,name:r}=e,l=document.createElement("li"),u=document.createElement("img"),d=document.createElement("h4"),o=document.createElement("a");return l.className="card artistCard",u.src=n[1]?.url||n[0]?.url,u.alt=r,o.href=a?.spotify,o.target="_blank",d.innerText=r,o.appendChild(d),l.appendChild(u),l.appendChild(o),l}}class E{static getWrapperEl(){return document.querySelector("body > main > div > div.spotifyData > div > div.topArtistsContainer > ul")}static getContainerEl(){return document.querySelector("body > main > div > div.spotifyData > div > div.topArtistsContainer")}static clear(){this.getWrapperEl().innerHTML=""}static hide(){this.getContainerEl().style="display: none;"}static show(){this.getWrapperEl().style=""}static addArtist(e){const n=F.createArtistCard(e);this.getWrapperEl()?.appendChild(n)}}const p=new Audio;class g{static getWrapperEl(){return document.getElementById("topTracksListContainer")}static getContainerEl(){return document.getElementById("topTracksContainer")}static clear(){this.getWrapperEl().innerHTML=""}static hide(){this.getContainerEl().style="display: none;"}static show(){this.getContainerEl().style=""}static addTrack(e={}){const{album:n={},name:a,external_urls:r,artists:l,preview_url:u}=e,{images:d=[]}=n,o=new b;l.forEach(D=>o.addArtist(D)),o.updateCoverArt(d,a,u),o.updateSongTitle(a,r?.spotify),o.apppendToDom(this.getWrapperEl())}}class b{constructor(){this.createElements()}createElements(){this.cardContainerEl=document.createElement("li"),this.cardContainerEl.className="card trackCard",this.coverArtEl=document.createElement("img"),this.songTitleEl=document.createElement("h4"),this.songTitleContainerEl=document.createElement("a"),this.metaDiv=document.createElement("div"),this.artistContainer=document.createElement("span")}addArtist(e={}){const n=!this.artistContainer.innerText;this.artistContainer.innerText=this.artistContainer.innerText.concat(n?"":", ",e.name)}updateCoverArtPreviewUrl(e){e&&(this.coverArtEl.classList.add("hasPreview"),this.coverArtEl.addEventListener("click",()=>{if(p.src===e&&!p.paused){this.coverArtEl.classList.remove("playing"),p.pause();return}p.src=e,this.coverArtEl.classList.add("playing"),p.play()}))}updateCoverArt(e=[],n,a){this.coverArtEl.src=e[1]?.url||e[0]?.url,this.coverArtEl.alt=n,this.updateCoverArtPreviewUrl(a)}updateSongTitle(e,n){this.songTitleEl.innerText=e,n&&(this.songTitleContainerEl.href=n,this.songTitleContainerEl.target="_blank")}apppendToDom(e){this.songTitleContainerEl.appendChild(this.songTitleEl),this.metaDiv.appendChild(this.songTitleContainerEl),this.metaDiv.appendChild(this.artistContainer),this.cardContainerEl.appendChild(this.coverArtEl),this.cardContainerEl.appendChild(this.metaDiv),e.appendChild(this.cardContainerEl)}}function N(t){t&&t.classList.add("displayNone")}function C(t){t&&t.classList.remove("displayNone")}class M{static getVinylEl(){return document.getElementById("nowPlayingTrackVinyl")}static spin(){this.getVinylEl()?.classList.add("spinVinyl")}static stopSpin(){this.getVinylEl()?.classList.remove("spinVinyl")}static updateImage(e=[],n){this.getVinylEl().style.backgroundImage=`url('${e[1]?.url||e[0]?.url}')`,this.getVinylEl().alt=n}}class O{static createArtistEl(e={}){const{name:n="",external_urls:a}=e,r=document.createElement("a");return r.innerText=n,r.href=a.spotify,r.target="_blank",r}static getContainerEl(){return document.getElementById("nowPlayingArtists")}static clear(){this.getContainerEl().innerHTML=""}static add(e={}){const n=this.getContainerEl();n.innerHTML===""||(n.innerHTML=n.innerHTML.concat(", "));const r=this.createArtistEl(e);n?.append(r)}}class H{static getEl(){return document.getElementById("nowPlayingTitle")}static setTitle(e){const n=this.getEl();n.innerHTML=e,n.target="_blank"}static setLink(e){const n=this.getEl();n.href=e,n.target="_blank"}}class c{static vinyl=M;static artists=O;static title=H;static getNotPlayingMessageWrapperEl(){return document.getElementById("notPlayingWrap")}static getNowPlayingWrapper(){return document.getElementById("nowPlayingInfo")}static hideNowPlayingWrapper(){N(this.getNowPlayingWrapper())}static hideNotPlayingWrapper(){N(this.getNotPlayingMessageWrapperEl())}static showNowPlayingWrapper(){C(this.getNowPlayingWrapper())}static showNotPlayingWrapper(){C(this.getNotPlayingMessageWrapperEl())}}function Q(t={}){const{is_playing:e,item:n={}}=t,{name:a,artists:r,external_urls:l,album:u={}}=n,{images:d}=u;if(!e){c.hideNowPlayingWrapper(),c.showNotPlayingWrapper(),c.vinyl.stopSpin();return}c.showNowPlayingWrapper(),c.hideNotPlayingWrapper(),c.title.setTitle(a),c.title.setLink(l.spotify),c.vinyl.updateImage(d,a),c.vinyl.spin(),c.artists.clear(),r?.forEach(o=>c.artists.add(o))}function X(t=[]){if(!t.length){E.hide();return}E.clear(),E.show(),t.forEach((e={})=>E.addArtist(e))}function V(t=[]){if(g.clear(),!t.length){g.hide();return}g.clear(),g.show(),t.forEach((e={})=>g.addTrack(e))}function q(t){const e=document.querySelector("body > main > div > div.spotifyData > div > a.spotifyLogoContainer");e.href=t}async function j(){try{const t=await x(),{myProfile:e,artists:n,tracks:a}=t;q(e?.external_urls?.spotify),X(n),V(a)}catch(t){console.error(t)}}j();var A=(t=>(t.NORTHERN="Northern",t.SOUTHERN="Southern",t))(A||{}),G=(t=>(t.NEW="🌑",t.WAXING_CRESCENT="🌒",t.FIRST_QUARTER="🌓",t.WAXING_GIBBOUS="🌔",t.FULL="🌕",t.WANING_GIBBOUS="🌖",t.LAST_QUARTER="🌗",t.WANING_CRESCENT="🌘",t))(G||{}),B=(t=>(t.NEW="🌑",t.WAXING_CRESCENT="🌘",t.FIRST_QUARTER="🌗",t.WAXING_GIBBOUS="🌖",t.FULL="🌕",t.WANING_GIBBOUS="🌔",t.LAST_QUARTER="🌓",t.WANING_CRESCENT="🌒",t))(B||{}),i=(t=>(t.NEW="New",t.WAXING_CRESCENT="Waxing Crescent",t.FIRST_QUARTER="First Quarter",t.WAXING_GIBBOUS="Waxing Gibbous",t.FULL="Full",t.WANING_GIBBOUS="Waning Gibbous",t.LAST_QUARTER="Last Quarter",t.WANING_CRESCENT="Waning Crescent",t))(i||{});const f=24405875e-1,z=2.4234366115277777e6,$=27.55454988,m=29.53058770576;class T{static fromDate(e=new Date){return e.getTime()/864e5-e.getTimezoneOffset()/1440+f}static toDate(e){const n=new Date;return n.setTime((e-f+n.getTimezoneOffset()/1440)*864e5),n}}const y={hemisphere:A.NORTHERN},W=t=>(t-=Math.floor(t),t<0&&(t+=1),t);class s{static lunarAge(e=new Date){return s.lunarAgePercent(e)*m}static lunarAgePercent(e=new Date){return W((T.fromDate(e)-24515501e-1)/m)}static lunationNumber(e=new Date){return Math.round((T.fromDate(e)-z)/m)+1}static lunarDistance(e=new Date){const n=T.fromDate(e),a=s.lunarAgePercent(e)*2*Math.PI,r=2*Math.PI*W((n-24515622e-1)/$);return 60.4-3.3*Math.cos(r)-.6*Math.cos(2*a-r)-.5*Math.cos(2*a)}static lunarPhase(e=new Date,n){n={...y,...n};const a=s.lunarAge(e);return a<1.84566173161?i.NEW:a<5.53698519483?i.WAXING_CRESCENT:a<9.22830865805?i.FIRST_QUARTER:a<12.91963212127?i.WAXING_GIBBOUS:a<16.61095558449?i.FULL:a<20.30227904771?i.WANING_GIBBOUS:a<23.99360251093?i.LAST_QUARTER:a<27.68492597415?i.WANING_CRESCENT:i.NEW}static lunarPhaseEmoji(e=new Date,n){n={...y,...n};const a=s.lunarPhase(e);return s.emojiForLunarPhase(a,n)}static emojiForLunarPhase(e,n){const{hemisphere:a}={...y,...n};let r;switch(a===A.SOUTHERN?r=B:r=G,e){case i.WANING_CRESCENT:return r.WANING_CRESCENT;case i.LAST_QUARTER:return r.LAST_QUARTER;case i.WANING_GIBBOUS:return r.WANING_GIBBOUS;case i.FULL:return r.FULL;case i.WAXING_GIBBOUS:return r.WAXING_GIBBOUS;case i.FIRST_QUARTER:return r.FIRST_QUARTER;case i.WAXING_CRESCENT:return r.WAXING_CRESCENT;default:case i.NEW:return r.NEW}}static isWaxing(e=new Date){return s.lunarAge(e)<=14.765}static isWaning(e=new Date){return s.lunarAge(e)>14.765}}const S=s.lunarPhase(),J=s.isWaxing(),K=s.isWaning(),Y=s.lunarAge().toFixed(2).concat(" Days"),Z=s.emojiForLunarPhase(S).concat(" ",S),tt=s.lunarDistance().toFixed(2),et=(s.lunarAgePercent()*100).toFixed(2).concat("%"),nt=J?"Waxing":K?"Waning":"",I=document.querySelector("#moonInfo_phase > b"),w=document.querySelector("#moonInfo_age > b"),L=document.querySelector("#moonInfo_waxWane > b"),P=document.querySelector("#moonInfo_distance > b"),R=document.querySelector("#moonInfo_agePercent > b");L&&(L.innerHTML=nt);w&&(w.innerHTML=Y);P&&(P.innerHTML=tt);R&&(R.innerHTML=et);I&&(I.innerHTML=Z);async function U(){clearTimeout(window.topSongsTimeout);try{Q(await k())}catch(t){console.error(t)}finally{window.topSongsTimeout=setTimeout(U,6e4)}}U();const h=document.getElementById("copyBtn");let _;h.addEventListener("click",()=>{const t=String(h.dataset.value||"");t&&(h.dataset.copying="true",navigator.clipboard.writeText(t),clearTimeout(_),_=setTimeout(()=>{h.dataset.copying="false"},600))});
