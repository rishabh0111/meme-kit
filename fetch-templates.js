// Download the template images listed in templates.json into templates/.
//   node fetch-templates.js            fetch what is missing
//   node fetch-templates.js --force    fetch everything again
// The images are not in this repo: they are other people's pictures, so each
// one is fetched from the source URL recorded for it and checked against its
// sha256. A mismatch is kept with a warning: the host may have re-encoded it,
// and the text boxes are fractions of the image, so a resize still lines up.
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const force=process.argv.includes("--force");
const templates=JSON.parse(fs.readFileSync(path.join(__dirname,"templates.json"),"utf8"));
const dir=path.join(__dirname,"templates");
fs.mkdirSync(dir,{recursive:true});
(async()=>{
  let fetched=0, failed=0;
  for(const [key,t] of Object.entries(templates)){
    const out=path.join(dir,t.file);
    if(!force&&fs.existsSync(out)) continue;
    if(!t.source){ console.warn(`skip ${key}: no source URL; put ${t.file} in templates/ yourself`); continue; }
    try{
      const r=await fetch(t.source);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf=Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(out,buf);
      const sha=crypto.createHash("sha256").update(buf).digest("hex");
      if(t.sha256&&sha!==t.sha256) console.warn(`warning: ${key} differs from the recorded image (sha256 ${sha.slice(0,12)}…); check a render`);
      console.log(`${key.padEnd(20)} ${(buf.length/1024).toFixed(0).padStart(5)} KB  ${t.source}`);
      fetched++;
    }catch(e){ console.error(`${key}: ${e.message} (${t.source})`); failed++; }
  }
  console.log(`\nfetched ${fetched}, failed ${failed}, ${Object.keys(templates).length} templates in templates.json`);
  if(failed) process.exit(1);
})();
