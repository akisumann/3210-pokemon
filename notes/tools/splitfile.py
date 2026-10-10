import re,os,glob,unicodedata,urllib.parse
def slug(h):
    h=h.strip().lower()
    return ''.join(c for c in h if c in '-_ ' or unicodedata.category(c)[0] not in 'PSZC').replace(' ','-')
def headings(path):
    hs={}
    seen={}
    for l in open(path,encoding='utf-8'):
        if re.match(r'^#{1,6} ',l):
            s=slug(re.sub(r'^#+\s*','',l.rstrip('\n'))); n=seen.get(s,0); seen[s]=n+1
            hs[s if n==0 else f'{s}-{n}']=1
    return hs
def relink(old_path, new_paths):
    """rewrite links pointing to old_path#anchor to whichever new file has the anchor"""
    old_abs=os.path.normpath(old_path)
    owners={}
    for np in new_paths:
        for a in headings(np): owners.setdefault(a,np)
    changed=0
    for p in glob.glob('**/*.md',recursive=True):
        t=open(p,encoding='utf-8').read(); o=t
        def fix(m):
            u=m.group(1)
            path,_,a=u.partition('#')
            base=os.path.dirname(p)
            tgt=os.path.normpath(os.path.join(base,urllib.parse.unquote(path))) if path else os.path.normpath(p)
            if tgt!=old_abs or not a: return m.group(0)
            np=owners.get(a.lower())
            if not np or os.path.normpath(np)==old_abs: return m.group(0)
            rel=os.path.relpath(np,base)
            return m.group(0).replace(u, rel+'#'+a)
        t=re.sub(r'\]\(([^)\s]+)\)',fix,t)
        if t!=o: open(p,'w',encoding='utf-8').write(t); changed+=1
    return changed
def fix_local(new_paths):
    owners={}
    for np in new_paths:
        for a in headings(np): owners.setdefault(a,np)
    for np in new_paths:
        own=headings(np); t=open(np,encoding='utf-8').read(); o=t
        def f(m):
            a=m.group(1)
            if a.lower() in own or a.lower() not in owners: return m.group(0)
            return '](' + os.path.relpath(owners[a.lower()],os.path.dirname(np)) + '#' + a + ')'
        t=re.sub(r'\]\(#([^)\s]+)\)',f,t)
        if t!=o: open(np,'w',encoding='utf-8').write(t)
def write_parts(src, parts, header_fn):
    L=open(src,encoding='utf-8').read().split('\n')
    out={}
    for path,ranges,title in parts:
        body=[]
        for a,b in ranges: body+=L[a-1:b]
        out[path]=(title,body)
    for path,(title,body) in out.items():
        txt=header_fn(path,title)+body
        open(path,'w',encoding='utf-8').write('\n'.join(txt).rstrip('\n')+'\n')
    allt=''.join(open(p,encoding='utf-8').read() for p in out)
    lost=[l for l in L if l.strip() and l not in allt]
    return lost
