// Connects the mockup UI to the real backend.
var me = null, tok = null;
try { tok = localStorage.getItem('mq_t'); me = JSON.parse(localStorage.getItem('mq_u') || 'null'); } catch (e) {}
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function api(path, body) {
  var o = { headers: { 'Content-Type': 'application/json' } };
  if (tok) o.headers.Authorization = 'Bearer ' + tok;
  if (body) { o.method = 'POST'; o.body = JSON.stringify(body); }
  return fetch(path, o).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Error'); return j; }); });
}
function setMe(r) { tok = r.token; me = r.user; try { localStorage.setItem('mq_t', tok); localStorage.setItem('mq_u', JSON.stringify(me)); } catch (e) {} bar(); loadPosts().then(function () { go('home'); }); }
function bar() {
  document.querySelector('.ban').textContent = 'Pilot version. Use a nickname, never your real name.';
  var b = document.getElementById('lg2');
  if (!b) { b = document.createElement('button'); b.id = 'lg2'; b.className = 'b o'; document.querySelector('nav').appendChild(b); }
  b.textContent = me ? me.nick + ' (log out)' : 'Log in';
  b.onclick = function () { if (me) { me = tok = null; try { localStorage.clear(); } catch (e) {} bar(); go('home'); } else go('login'); };
}
function loadPosts() {
  return api('/api/posts').then(function (rows) {
    P.length = 0; has = {};
    rows.forEach(function (r, i) { P.push({ id: r.id, n: esc(r.nick), k: esc(r.klass), p: r.place, t: esc(r.title), s: esc(r.story), v: r.visual }); likes[i] = r.likes; has[r.place] = 1; });
    document.querySelectorAll('#map .t').forEach(function (t) { t.classList.toggle('h', !!has[t.textContent]); });
  });
}
lk = function (a) { if (!me) return go('login'); api('/api/posts/' + P[a].id + '/like', {}).then(function (r) { likes[a] = r.likes; document.getElementById('lk').textContent = 'Appreciate ' + r.likes; }); };
window.doAuth = function (mode) {
  var v = function (id) { return document.getElementById(id).value; };
  var body = { nick: v('u'), password: v('p') };
  if (mode === 'register') { body.role = v('r'); body.klass = v('c'); body.code = v('k'); }
  api('/api/' + mode, body).then(setMe).catch(function (e) { document.getElementById('msg').textContent = e.message; });
};
var g2 = go;
go = function (v, a) {
  if (v === 'login') { E('<h2>Log in or join</h2><p class="mut">Use a nickname, not your real name.</p><label>Nickname</label><input id="u"><label>Password</label><input id="p" type="password"><label>I am a</label><select id="r"><option value="student">Student</option><option value="teacher">Teacher</option></select><label>Class (students)</label><input id="c" value="Class 8"><label>Teacher code (teachers only)</label><input id="k"><p id="msg" style="color:#c0392b"></p><button class="b" onclick="doAuth(\'login\')">Log in</button> <button class="b o" onclick="doAuth(\'register\')">Create account</button>'); return; }
  if (v === 'write') {
    if (!me || me.role !== 'student') { go('login'); return; }
    E('<h2>New post</h2><p class="mut">Your teacher reviews it before it goes live.</p><label>Place</label><select id="wp">' + T.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select><label>Title</label><input id="wt"><label>Story</label><textarea id="ws" rows="6" placeholder="What did you find? Where did the data come from?"></textarea><label>Visual</label><select id="wv"><option value="bars">Bar chart</option><option value="line">Line chart</option><option value="time">Timeline</option><option value="dots">Dots</option></select><label style="display:flex;gap:8px"><input id="wh" type="checkbox" style="width:auto">Allow sharing on social media (teacher must approve too)</label><p id="msg" style="color:#c0392b"></p><button class="b" onclick="sendPost(this)">Submit for approval</button>'); return;
  }
  if (v === 'teacher') {
    if (!me || me.role !== 'teacher') { go('login'); return; }
    api('/api/pending').then(function (rows) {
      E('<h2>Teacher view</h2><p class="mut">Posts waiting for approval. Nothing goes public until you say so.</p>' + (rows.length ? rows.map(function (r) { return '<div class="row"><div><b>' + esc(r.nick) + '</b> | ' + esc(NM[r.place] || r.place) + '<br><b>' + esc(r.title) + '</b><br><span class="mut" style="font-size:13px">' + esc(r.story) + '</span></div><div><button class="b" onclick="rev(\'' + r.id + '\',\'approve\',this)">Approve</button> <button class="b o" onclick="rev(\'' + r.id + '\',\'back\',this)">Send back</button></div></div>'; }).join('') : '<p class="mut">Nothing waiting.</p>'));
    });
    return;
  }
  g2(v, a);
};
window.sendPost = function (b) {
  var v = function (id) { return document.getElementById(id).value; };
  api('/api/posts', { place: v('wp'), title: v('wt'), story: v('ws'), visual: v('wv'), share: document.getElementById('wh').checked })
    .then(function () { b.textContent = 'Sent to your teacher'; b.disabled = true; })
    .catch(function (e) { document.getElementById('msg').textContent = e.message; });
};
window.rev = function (id, d, b) { api('/api/posts/' + id + '/review', { decision: d }).then(function () { b.parentNode.innerHTML = '<span class="mut">' + (d === 'approve' ? 'Approved' : 'Sent back') + '</span>'; loadPosts(); }); };
bar(); loadPosts().then(function () { go('home'); });
