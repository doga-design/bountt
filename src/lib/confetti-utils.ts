import confetti from "canvas-confetti";

const P = {
  orange: '#E8480A',
  peach: '#FF7A45',
  blush: '#FFB89A',
  cream: '#FFF3ED',
  gold: '#FFC14D',
  white: '#FFFFFF',
  silver: '#DADADA',
  rose: '#FFD6C8',
};

export function testConfetti() {
  console.log('[confetti] testConfetti called');
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    zIndex: 9999,
  });
}

export function fireMemberAdded() {
  console.log('[confetti] fireMemberAdded called');
  confetti({ particleCount:28, angle:90, spread:52, startVelocity:22, origin:{x:0.5,y:0.72}, colors:[P.orange,P.peach,P.white,P.rose,P.blush], shapes:['circle','circle','square'], scalar:0.72, gravity:1.1, drift:0, ticks:150, zIndex:9999 });
  setTimeout(()=>{
    confetti({ particleCount:14, angle:72, spread:30, startVelocity:16, origin:{x:0.38,y:0.75}, colors:[P.orange,P.white,P.rose], shapes:['circle'], scalar:0.5, gravity:1.3, ticks:120, zIndex:9999 });
    confetti({ particleCount:14, angle:108, spread:30, startVelocity:16, origin:{x:0.62,y:0.75}, colors:[P.peach,P.cream,P.white], shapes:['circle'], scalar:0.5, gravity:1.3, ticks:120, zIndex:9999 });
  }, 100);
}

export function fireFirstCost() {
  console.log('[confetti] fireFirstCost called');
  confetti({ particleCount:38, angle:65, spread:65, startVelocity:28, origin:{x:0.5,y:0.7}, colors:[P.orange,P.peach,P.gold,P.white,P.rose], shapes:['square','circle'], scalar:0.85, gravity:0.95, drift:0.15, ticks:170, zIndex:9999 });
  confetti({ particleCount:38, angle:115, spread:65, startVelocity:28, origin:{x:0.5,y:0.7}, colors:[P.peach,P.blush,P.white,P.orange,P.cream], shapes:['square','circle'], scalar:0.85, gravity:0.95, drift:-0.15, ticks:170, zIndex:9999 });
  confetti({ particleCount:18, angle:90, spread:55, startVelocity:30, origin:{x:0.5,y:0.72}, colors:[P.gold,P.white,P.orange], shapes:['star'], scalar:0.9, gravity:0.9, ticks:160, zIndex:9999 });
  setTimeout(()=>{
    confetti({ particleCount:90, angle:58, spread:110, startVelocity:42, origin:{x:0.5,y:0.65}, colors:[P.orange,P.peach,P.gold,P.white,P.blush,P.rose,P.cream], shapes:['square','square','circle','star'], scalar:1.4, gravity:0.82, drift:0.25, ticks:240, zIndex:9999 });
    confetti({ particleCount:90, angle:122, spread:110, startVelocity:42, origin:{x:0.5,y:0.65}, colors:[P.orange,P.blush,P.white,P.gold,P.silver,P.peach], shapes:['square','square','circle','star'], scalar:1.4, gravity:0.82, drift:-0.25, ticks:240, zIndex:9999 });
    confetti({ particleCount:45, angle:90, spread:140, startVelocity:38, origin:{x:0.5,y:0.65}, colors:[P.white,P.gold,P.rose,P.orange,P.cream], shapes:['star','circle'], scalar:1.55, gravity:0.75, ticks:260, zIndex:9999 });
  }, 300);
}

export function fireFirstSettle() {
  console.log('[confetti] fireFirstSettle called');
  const cols=[[P.orange,P.cream,P.white],[P.peach,P.rose,P.silver],[P.orange,P.white,P.gold],[P.cream,P.peach,P.white],[P.silver,P.blush,P.rose]];
  [0.12,0.3,0.5,0.7,0.88].forEach((x,i)=>{
    setTimeout(()=>{
      confetti({ particleCount:12, angle:270, spread:22, startVelocity:7, origin:{x,y:0.02}, colors:cols[i], shapes:['circle','square'], scalar:0.82, gravity:0.5, drift:(Math.random()-.5)*.3, ticks:280, zIndex:9999 });
    }, i*200);
  });
  setTimeout(()=>{
    confetti({ particleCount:24, angle:270, spread:65, startVelocity:5, origin:{x:0.5,y:0.02}, colors:[P.orange,P.peach,P.white,P.gold,P.rose,P.blush], shapes:['circle','star'], scalar:0.68, gravity:0.42, ticks:320, zIndex:9999 });
  }, 500);
}
