const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/colorthief@2.4.0/dist/color-thief.min.js'
document.head.appendChild(script);
let lastUrl = null;

function waitForElement(els, func, timeout = 100) {
  const queries = els.map((el) => document.querySelector(el));
  if (queries.every((a) => a)) {
    func(queries);
  } else if (timeout > 0) {
    setTimeout(waitForElement, 300, els, func, --timeout);
  }
}

function random(min, max) {
  // min inclusive max exclusive
  return Math.random() * (max - min) + min;
}
function getCoverUrl() {
    const raw = Spicetify.Player?.data?.item?.metadata?.image_url;
    if (!raw) return null;
    return raw.replace("spotify:image:", "https://i.scdn.co/image/");
  }

  function getDominantColor(url) {
    return new Promise((resolve) => {
      if (!url) return resolve("rgb(30,215,96)");
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        resolve(`rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`);
      };
      img.onerror = () => resolve("rgb(30,215,96)");
    });
  }
function enhanceColor(rgb, saturationBoost = 1.7, lightnessBoost = 1.1) {
    const [r, g, b] = rgb.match(/\d+/g).map(Number);
    let r1 = r/255, g1 = g/255, b1 = b/255;
    const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h, s, l = (max+min)/2;

    if(max === min) { h=s=0; }
    else {
      const d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r1: h=(g1-b1)/d + (g1<b1?6:0); break;
        case g1: h=(b1-r1)/d + 2; break;
        case b1: h=(r1-g1)/d + 4; break;
      }
      h /= 6;
    }

    s = Math.min(s*saturationBoost,1);
    l = Math.min(l*lightnessBoost,1);

    function hsl2rgb(p,q,t){
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p + (q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    }

    let r2,g2,b2;
    if(s===0){ r2=g2=b2=l; }
    else {
      const q = l<0.5 ? l*(1+s) : l+s-l*s;
      const p = 2*l - q;
      r2 = hsl2rgb(p,q,h+1/3);
      g2 = hsl2rgb(p,q,h);
      b2 = hsl2rgb(p,q,h-1/3);
    }

    return `rgb(${Math.round(r2*255)},${Math.round(g2*255)},${Math.round(b2*255)})`;
  }
async function updateAccent() {
  const coverUrl = getCoverUrl();
  if (!coverUrl || coverUrl === lastUrl) return;
  if(coverUrl){
      const color = await getDominantColor(coverUrl);
      const enhanced = enhanceColor(color, 1.7, 1.1);
      document.documentElement.style.setProperty("--accent-color", enhanced);
    }
  lastUrl = coverUrl;
}

function waitForPlayer() {
  if (!Spicetify?.Player?.data?.item) {
    setTimeout(waitForPlayer, 300);
    return;
  }

  // Player is ready and song exists
  updateAccent();

  // Listen for future song changes
  Spicetify.Player.removeEventListener("songchange", updateAccent);
  Spicetify.Player.addEventListener("songchange", updateAccent);
}

waitForPlayer();

const interval = setInterval(() => {
  if (Spicetify?.Player) {
    clearInterval(interval);
    updateAccent();
    Spicetify.Player.addEventListener("songchange", updateAccent);
  }
}, 500);

waitForElement(['.Root__top-container'], ([topContainer]) => {
  const r = document.documentElement;
  const rs = window.getComputedStyle(r);

  const backgroundContainer = document.createElement('div');
  backgroundContainer.className = 'starrynight-bg-container';
  topContainer.appendChild(backgroundContainer);

  // to position stars and shooting stars between the background and everything else
  const rootElement = document.querySelector('.Root__top-container');
  rootElement.style.zIndex = '0';

  // create the stars
  const canvasSize =
    backgroundContainer.clientWidth * backgroundContainer.clientHeight;
  const starsFraction = canvasSize / 4000;
  for (let i = 0; i < starsFraction; i++) {
    const size = Math.random() < 0.5 ? 1 : 2;

    const star = document.createElement('div');
    star.style.position = 'absolute';
    star.style.left = `${random(0, 99)}%`;
    star.style.top = `${random(0, 99)}%`;
    star.style.opacity = random(0.5, 1);
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.backgroundColor = rs.getPropertyValue('--spice-star');
    star.style.zIndex = '-1';
    star.style.borderRadius = '50%';

    if (Math.random() < 1 / 5) {
      star.style.setProperty("animation", `twinkle${Math.floor(Math.random() * 4) + 1} 5s infinite`, "important");
    }

    backgroundContainer.appendChild(star);
  }

  // handles resizing of playbar panel to match right sidebar below it
  const playbar = document.querySelector('.Root__now-playing-bar');
  waitForElement(['.Root__right-sidebar'], ([rightbar]) => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === rightbar) {
          let newWidth = entry.contentRect.width;
          if (newWidth === 0) {
            const localStorageWidth = localStorage.getItem(
              '223ni6f2epqcidhx5etjafeai:panel-width-saved'
            );
            if (localStorageWidth) {
              newWidth = localStorageWidth;
            } else {
              newWidth = 420;
            }
          }
          playbar.style.width = `${newWidth}px`;
          break;
        }
      }
    });

    resizeObserver.observe(rightbar);
  });
  
  waitForElement(['[data-encore-id="buttonPrimary"]'], ([targetElement]) => {
    // start or stop spinning animation based on whether something is playing
    const playObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'aria-label'
        ) {
          handleLabelChange();
        }
      }
    });
  
    const playConfig = { attributes: true, attributeFilter: ['aria-label'] };
    playObserver.observe(targetElement, playConfig);
  });

  function handleLabelChange() {
    const img = document.querySelector(
      '.main-nowPlayingWidget-coverArt .cover-art img'
    );
    // checks the state of the play button on the playbar
    if (document.querySelector('[data-encore-id="buttonPrimary"]').getAttribute('aria-label') == 'Pause'){
      img.classList.add('running-animation');
    } else {
      img.classList.remove('running-animation');
    }
  }
  

  /*
  Pure CSS Shooting Star Animation Effect Copyright (c) 2021 by Delroy Prithvi (https://codepen.io/delroyprithvi/pen/LYyJROR)

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */
  for (let i = 0; i < 4; i++) {
    const shootingstar = document.createElement('span');
    shootingstar.className = 'shootingstar';
    if (Math.random() < 0.75) {
      shootingstar.style.top = '-4px'; // hidden off screen when animation is delayed
      shootingstar.style.right = `${random(0, 90)}%`;
    } else {
      shootingstar.style.top = `${random(0, 50)}%`;
      shootingstar.style.right = '-4px'; // hidden when animation is delayed
    }

    const shootingStarGlowColor = `rgba(${rs.getPropertyValue(
      '--spice-rgb-shooting-star-glow'
    )},${0.1})`;
    shootingstar.style.boxShadow = `0 0 0 4px ${shootingStarGlowColor}, 0 0 0 8px ${shootingStarGlowColor}, 0 0 20px ${shootingStarGlowColor}`;

    shootingstar.style.animationDuration = `${
      Math.floor(Math.random() * 3) + 3
    }s`;
    shootingstar.style.animationDelay = `${Math.floor(Math.random() * 7)}s`;

    backgroundContainer.appendChild(shootingstar);

    shootingstar.addEventListener('animationend', () => {
      if (Math.random() < 0.75) {
        shootingstar.style.top = '-4px'; // hidden off screen when animation is delayed
        shootingstar.style.right = `${random(0, 90)}%`;
      } else {
        shootingstar.style.top = `${random(0, 50)}%`;
        shootingstar.style.right = '-4px'; // hidden when animation is delayed
      }

      shootingstar.style.animation = 'none'; // Remove animation

      void shootingstar.offsetWidth;

      shootingstar.style.animation = '';
      shootingstar.style.setProperty("animation-duration", `${Math.floor(Math.random() * 4) + 3}s`, "important");
    });
  }
});

