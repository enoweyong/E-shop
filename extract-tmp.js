const fs = require("fs");
const c = fs.readFileSync("FrontEnd/index.html", "utf8");
const m = c.match(/<script>([\s\S]*)<\/script>/);
fs.writeFileSync("extract.js", m[1]);
