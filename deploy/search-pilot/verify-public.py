import json, re, urllib.request, urllib.error, urllib.parse, time, socket, ssl
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))
base='https://168.113.169.29'
def get(path, method='GET', expected=200):
    time.sleep(0.4)
    request=urllib.request.Request(base+path,method=method)
    try:
        with urllib.request.urlopen(request,timeout=20) as r:
            assert r.status==expected,(path,r.status)
            return r.read(),dict(r.headers)
    except urllib.error.HTTPError as e:
        assert e.code==expected,(path,e.code,expected)
        return e.read(),dict(e.headers)
body,headers=get('/')
assert 'frame-ancestors' in headers['Content-Security-Policy']
scripts=re.findall(r'<script[^>]+src="([^"]+)"',body.decode())
for script in scripts:
    content,_=get(script)
    assert b'http://localhost:5000' not in content
for css in re.findall(r'<link[^>]+href="([^"]+\.css)"',body.decode()):get(css)
health=json.loads(get('/healthz')[0]);assert health=={'status':'ok','records':2578}
assert len(json.loads(get('/test')[0]))==2578
f={'find':{'OAntigen':['2'],'H1Antigen':[],'H2Antigen':[]},'exclude':{'OAntigen':[],'H1Antigen':[],'H2Antigen':[]}}
filtered=json.loads(get('/filter?'+urllib.parse.urlencode({'filter':json.dumps(f)}))[0]);assert len(filtered)==4
f['find']['OAntigen']=[];f['exclude']['OAntigen']=['2']
excluded=json.loads(get('/filter?'+urllib.parse.urlencode({'filter':json.dumps(f)}))[0]);assert len(excluded)==2574
blocked=['/admin','/login','/register','/upload','/files','/.env','/.git/config','/server.js','/db.js','/data.json','/api/users','/static/js/../../db.js']
for path in blocked:get(path,expected=403)
get('/login',method='POST',expected=403)
get('/test',method='POST',expected=403)
get('/filter?filter=invalid',expected=400)
f['find']['OAntigen']=['2']*25
get('/filter?'+urllib.parse.urlencode({'filter':json.dumps(f)}),expected=400)
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
try:urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect).open('http://168.113.169.29/',timeout=15)
except urllib.error.HTTPError as e:assert e.code==308 and e.headers['Location']=='https://168.113.169.29/'
else:raise AssertionError('HTTP not redirected')
closed=[]
for port in [18088,5432,51821]:
    try:
        with socket.create_connection(('168.113.169.29',port),timeout=3):raise AssertionError(f'Private port {port} public')
    except (TimeoutError,ConnectionRefusedError,OSError):closed.append(port)
ctx=ssl.create_default_context()
with socket.create_connection(('168.113.169.29',443),timeout=15) as s:
    with ctx.wrap_socket(s,server_hostname='168.113.169.29') as tls:
        cert=tls.getpeercert();tlsversion=tls.version()
print(json.dumps({'url':base,'health':health,'filter_O2':len(filtered),'exclude_O2':len(excluded),'blocked_paths':len(blocked),'methods':'read_only','malformed_and_oversized_filter':'400','private_ports_unreachable':closed,'tls':tlsversion,'certificate_expires':cert['notAfter'],'http':'308_to_https','frontend_assets':'OK'},indent=2))
