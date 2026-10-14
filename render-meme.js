// Draw a meme.json's panel texts over its template and save the image.
//   node render-meme.js path/to/meme.json out.jpg     (or out.png)
// JPEG quality comes from $QUALITY (default 86). Templates must be fetched
// first: npm run fetch.
const fs=require("fs"), path=require("path"), puppeteer=require("puppeteer");
const [,,specPath,outPath]=process.argv;
if(!specPath||!outPath){ console.error("usage: node render-meme.js meme.json out.jpg|out.png"); process.exit(2); }
(async()=>{
  const spec=JSON.parse(fs.readFileSync(specPath,"utf8"));
  const templates=JSON.parse(fs.readFileSync(path.join(__dirname,"templates.json"),"utf8"));
  const L=templates[spec.template];
  if(!L) throw new Error(`unknown template "${spec.template}" — have: ${Object.keys(templates).join(", ")}`);
  if(!fs.existsSync(path.join(__dirname,"templates",L.file)))
    throw new Error(`templates/${L.file} is missing — run "npm run fetch" in ${__dirname}`);
  const given=(spec.panels||[]).length;
  if(given>L.boxes.length) console.warn(`warning: ${spec.template} has ${L.boxes.length} boxes, ${given} panels given; the extra are dropped`);
  const sc=spec.scale||1;
  fs.mkdirSync(path.dirname(path.resolve(outPath)),{recursive:true});
  const b=await puppeteer.launch({args:["--no-sandbox"]});
  try{
    const p=await b.newPage();
    p.on("pageerror",e=>console.log("PAGEERROR:",e.message));
    await p.setViewport({width:Math.round(L.w*sc),height:Math.round(L.h*sc),
                         deviceScaleFactor:spec.dpr||1.5});
    await p.evaluateOnNewDocument((s,l)=>{window.SPEC=s;window.LAYOUT=l;},spec,L);
    await p.goto("file://"+path.resolve(__dirname,"meme.html"),{waitUntil:"networkidle0"});
    await p.waitForFunction("window.__ready===true||window.__error");
    const err=await p.evaluate("window.__error");
    if(err) throw new Error(err);
    const jpeg=/\.jpe?g$/i.test(outPath);
    await p.screenshot({path:outPath,type:jpeg?"jpeg":"png",...(jpeg?{quality:+(process.env.QUALITY||86)}:{})});
  } finally { await b.close(); }
  console.log("->",outPath);
})().catch(e=>{ console.error(e.message); process.exit(1); });
