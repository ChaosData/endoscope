//"use strict";

let cw = document.createElement('iframe');

cw.style.zIndex = -1;
cw.style.position = "absolute";
cw.style.height = "1px";
cw.style.width = "1px";
cw.style.top = "-2px";
cw.style.left = "-2px";

cw.sandbox = 'allow-forms allow-same-origin allow-scripts';
document.body.appendChild(cw);


let pages = [];
pages.push("https://developer.mozilla.org/");
pages.push("https://developer.mozilla.org/en-US/docs/Web");

let pwctx = {
  cw: cw,
  pw: window,
  pages: pages,
  scan: scan,
  ajaxed: false,
  ajaxedurl: null,
  skipload: false
};

function nextpage(pwctx) {
  if (pwctx.pages.length > 0) {
    pwctx.cw.src = pwctx.pages.shift();
  }
}

function oobload(pwctx) {
  console.log("oobload");
  console.log(this);
  const url = pwctx.cw.src;

  pwctx.skipload = true;
  pwctx.cw.src = "about:blank";
  
  fetch(new Request(url, {
    method: "GET",
    headers: {},
    mode: 'same-origin',
    cache: 'no-cache'
  }))
  .then((res) => {
    return res.text();
  })
  .then((text) => {
    pwctx.ajaxed = true;
    pwctx.ajaxedurl = url;

    pwctx.cw.contentDocument.write(text);
    pwctx.skipload = false;

    //not super resilient to redirects
    //pwctx.cw.contentWindow.history.replaceState(null, null, url); //note: doesn't really want to work
    scan(pwctx)
  })
  .catch((err) => {
    console.log(err);
    nextpage(pwctx);
  });
}

function scan(pwctx) {
  console.log("scan");
  const ajaxed = pwctx.ajaxed;
  const ajaxedurl = pwctx.ajaxedurl;
  pwctx.ajaxed = false;
  pwctx.ajaxedurl = null;

  console.log("ajaxed: " + ajaxed);
  if (ajaxed) {
    console.log(ajaxedurl); //can "silently" redirect
  } else {
    console.log(pwctx.cw.src);
  }
  console.log(pwctx.cw.contentDocument.documentElement.innerHTML.slice(0,100));

  //magic, maybe appends to pages

  nextpage(pwctx);
}

window.addEventListener("message", ((pwctx) => {
  return (event) => {
    if (event.origin !== window.location.origin) {
      console.log("bad origin: " + event.origin);
      return;
    }
    if (event.data === "oobload") {
      oobload(pwctx);
    }
  };
})(pwctx), false);

cw.addEventListener("load", ((pwctx)=>{
  return (e)=>{
    if (pwctx.skipload) {
      return;
    }

    try {
      if (location.href === "about:blank") {
        return;
      }
      if (pwctx.cw.src === "about:blank") {
        return;
      }
      const x = pwctx.cw.contentWindow.document;
    } catch (e) {
      //console.log(JSON.stringify(e));
      if (pwctx.pw.location.origin === new URL(pwctx.cw.src).origin) {
        console.log("error: x-frame-options");
        //setTimeout(oobload.bind(this, pwctx), 1);
        parent.postMessage("oobload", pwctx.pw.location.origin);
      } else {
        console.log("error: cross origin");
        //setTimeout(nextpage.bind(this, pwctx), 1);
        nextpage(pwctx);
      }
      return;
    }

    pwctx.cw.contentWindow.window.addEventListener("beforeunload", ((pwctx)=>{
      return (e)=>{
        console.log("beforeunload");
        console.log("href: " + this.location.href);
        console.log("src: " + pwctx.cw.src);
        pwctx.cofailtimer = pwctx.pw.setTimeout(()=>{pwctx.cofail(pwctx);}, 5000);
      };
    })(pwctx));

    setTimeout(pwctx.scan.bind(this, pwctx), 2000); //or whatever else can be
                                                    //used to determine when
                                                    //the page is ready to
                                                    //crawl
  };
})(pwctx));


nextpage(pwctx);
