import re,hashlib,base64,urllib.parse,os
SRC="/sdcard/Download/克克 ˚.ₒ (6).html"
OUT="/root/conflux/src/ui/keke-original"
AST="/root/conflux/public/theme-assets/keke-original"
URLBASE="/theme-assets/keke-original/"
s=open(SRC,encoding='utf-8').read()
styles=[m.group(1) for m in re.finditer(r'<style[^>]*>(.*?)</style>',s,re.S)]
EXT={'font/woff2':'woff2','font/woff':'woff','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg','image/gif':'gif'}
saved={}
def ext_uri(mt,enc,data):
    if enc=='base64': raw=base64.b64decode(data)
    else: raw=urllib.parse.unquote_to_bytes(data)
    h=hashlib.sha1(raw).hexdigest()[:10]
    e=EXT.get(mt)
    if not e: return None
    fn=f"{h}.{e}"
    open(os.path.join(AST,fn),'wb').write(raw); saved[fn]=len(raw)
    return URLBASE+fn
pat=re.compile(r'url\(\s*(?P<q>&quot;|["\']?)data:(?P<mt>[a-z0-9/+.\-]+)(?P<enc>;base64)?,(?P<d>.*?)(?P=q)\s*\)',re.S)
def conv(css):
    def r(m):
        mt=m.group('mt');enc='base64' if m.group('enc') else ''
        d=m.group('d')
        u=ext_uri(mt,enc,d)
        return f'url({u})' if u else m.group(0)
    return pat.sub(r,css)
parts={}
parts['vars']=styles[0]+"\n"+styles[1]
s2=styles[2]
k=s2.index('/* ---------- chat ---------- */')
parts['chat']=s2[k:]
parts['extra']=styles[3]
parts['skins']=styles[4]
for n,c in parts.items():
    c=conv(c)
    open(f"{OUT}/original-{n}.css",'w',encoding='utf-8').write(c)
    print(n,len(c),'remaining data:',c.count('data:'))
print(len(saved),'assets',sum(saved.values()))
