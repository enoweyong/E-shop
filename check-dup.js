const fs = require("fs");
const c = fs.readFileSync("FrontEnd/index.html", "utf8");
console.log("showForgotPassword:", (c.match(/showForgotPassword/g) || []).length);
console.log("signInWithGoogle:", (c.match(/signInWithGoogle/g) || []).length);
console.log("forgotPasswordModal:", (c.match(/forgotPasswordModal/g) || []).length);
const m = c.match(/<script>([\s\S]*)<\/script>/);
fs.writeFileSync("extract.js", m[1]);
