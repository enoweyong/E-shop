const fs = require("fs");
// Resolve FrontEnd/index.html: prefer HEAD side (has newer remote content + auth UI), drop duplicate markers
let c = fs.readFileSync("FrontEnd/index.html", "utf8");
const markers = (c.match(/<<<<<<<|=======|>>>>>>>/g) || []).length;
console.log("index.html marker lines:", markers);

function resolve(src) {
  // For each conflict block keep the HEAD side (before =======)
  return src.replace(
    /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?\r?\n>>>>>>> [^\r\n]*\r?\n/g,
    "$1"
  );
}

if (c.includes("<<<<<<<")) {
  c = resolve(c);
  fs.writeFileSync("FrontEnd/index.html", c);
  console.log("index.html resolved");
}

// patch-auth-ui.js: keep HEAD version
try {
  let p = fs.readFileSync("patch-auth-ui.js", "utf8");
  if (p.includes("<<<<<<<")) {
    p = resolve(p);
    fs.writeFileSync("patch-auth-ui.js", p);
    console.log("patch-auth-ui.js resolved");
  }
} catch (e) {
  console.log("patch-auth-ui.js:", e.message);
}

// Verify index.html still has exactly one copy of each handler
const n1 = (c.match(/function showForgotPassword/g) || []).length;
const n2 = (c.match(/function signInWithGoogle/g) || []).length;
console.log("showForgotPassword defs:", n1, "| signInWithGoogle defs:", n2);
