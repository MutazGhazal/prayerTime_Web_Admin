const { useEffect, useState } = React;

/* ========== Config ========== */
const config = window.APP_CONFIG;
if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  document.getElementById("root").innerHTML =
    "<div class='auth-page'><div class='auth-card'><p>يرجى إنشاء ملف config.js</p></div></div>";
}
if (!window.supabase) {
  document.getElementById("root").innerHTML =
    "<div class='auth-page'><div class='auth-card'><p>تعذر تحميل Supabase</p></div></div>";
}
const supabase = window.supabase
  ? window.supabase.createClient(config?.SUPABASE_URL, config?.SUPABASE_ANON_KEY)
  : null;

/* المقاس المطلوب للإعلانات حسب التصميم 9:16 (يظهر في التطبيق بارتفاع 140) */
const AD_IMAGE_DIMENSIONS = "360×140 بكسل (أو 720×280 للوضوح)";

/* ========== Helpers ========== */
let _itemId = 0;
const emptyItem = () => ({ _key: ++_itemId, title: "", body: "", image_url: "", link_url: "" });

/* ========== Toast System ========== */
let _toastList = [];
let _setToasts = null;
function showToast(msg, type) {
  if (!type) type = "success";
  const id = Date.now();
  _toastList = _toastList.concat([{ id: id, msg: msg, type: type }]);
  if (_setToasts) _setToasts(_toastList.slice());
  setTimeout(function() {
    _toastList = _toastList.filter(function(t) { return t.id !== id; });
    if (_setToasts) _setToasts(_toastList.slice());
  }, 3000);
}
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(function(t) {
        return <div key={t.id} className={"toast " + t.type}>{t.msg}</div>;
      })}
    </div>
  );
}

/* ========== Error Boundary ========== */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: "center", padding: 40, margin: 40 }}>
          <p>حدث خطأ غير متوقع</p>
          <p className="muted">{String(this.state.error)}</p>
          <button className="btn-save" onClick={() => this.setState({ hasError: false })}>إعادة المحاولة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ========== Main App ========== */
function App() {
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAds, setAdminAds] = useState([emptyItem()]);
  const [marketing, setMarketing] = useState([emptyItem()]);

  if (!supabase) {
    return <div className="auth-page"><div className="auth-card">تعذر تشغيل لوحة التحكم</div></div>;
  }

  useEffect(function() {
    supabase.auth.getSession().then(function(res) { setSession(res.data.session); });
    var sub = supabase.auth.onAuthStateChange(function(e, s) {
      setSession(s);
      if (e === "PASSWORD_RECOVERY" && s) setRecoveryMode(true);
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(function() {
    if (session) checkAdminAndLoad();
  }, [session]);

  async function checkAdminAndLoad() {
    var uid = session && session.user ? session.user.id : null;
    if (!uid) { setIsAdmin(false); return; }
    var res = await supabase.from("admin_users").select("id").eq("user_id", uid).maybeSingle();
    if (res.error || !res.data) {
      setIsAdmin(false);
      setAuthMsg({ type: "error", text: "هذا الحساب غير مسجل كأدمن. فقط المسجلون كأدمن يمكنهم الدخول." });
      await supabase.auth.signOut();
      return;
    }
    setAuthMsg(null);
    setIsAdmin(true);
    loadAdminSections();
  }

  async function loadAdminSections() {
    var res = await supabase.from("admin_sections").select("*").order("sort_order", { ascending: true });
    if (res.error) { showToast(res.error.message, "error"); return; }
    var g = groupBySection(res.data || []);
    setAdminAds((g[4] || []).length ? g[4] : [emptyItem()]);
    setMarketing((g[5] || []).length ? g[5] : [emptyItem()]);
  }

  async function signIn() {
    setAuthBusy(true); setAuthMsg(null);
    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    setAuthBusy(false);
    if (res.error) setAuthMsg({ type: "error", text: res.error.message });
  }

  var redirectUrl = (config.WEB_ADMIN_URL || (window.location.origin + window.location.pathname + window.location.search)).replace(/\/$/, "") + "/";
  async function sendResetPassword() {
    var em = (resetEmail || "").trim();
    if (!em) { setAuthMsg({ type: "error", text: "أدخل البريد الإلكتروني" }); return; }
    setAuthBusy(true); setAuthMsg(null);
    var res = await supabase.auth.resetPasswordForEmail(em, { redirectTo: redirectUrl });
    setAuthBusy(false);
    if (res.error) setAuthMsg({ type: "error", text: res.error.message });
    else { setResetSent(true); setAuthMsg({ type: "success", text: "تم إرسال رابط إعادة التعيين إلى بريدك. تحقق من صندوق الوارد (والسخام)." }); }
  }

  async function setNewPasswordSubmit() {
    var p = (newPassword || "").trim();
    var c = (confirmPassword || "").trim();
    if (!p || p.length < 6) { setAuthMsg({ type: "error", text: "كلمة المرور الجديدة 6 أحرف على الأقل" }); return; }
    if (p !== c) { setAuthMsg({ type: "error", text: "كلمتا المرور غير متطابقتين" }); return; }
    setAuthBusy(true); setAuthMsg(null);
    var res = await supabase.auth.updateUser({ password: p });
    setAuthBusy(false);
    if (res.error) setAuthMsg({ type: "error", text: res.error.message });
    else { setRecoveryMode(false); setNewPassword(""); setConfirmPassword(""); setAuthMsg({ type: "success", text: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن." }); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminAds([emptyItem()]);
    setMarketing([emptyItem()]);
  }

  async function uploadImage(file) {
    var bucket = config.BUCKET || "uploads";
    if (!file) return "";
    setUploading(true);
    try {
      var ext = file.name.split(".").pop();
      var path = "admin/" + Date.now() + "." + ext;
      var res = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (res.error) { showToast("خطأ رفع: " + res.error.message, "error"); return ""; }
      var urlRes = supabase.storage.from(bucket).getPublicUrl(path);
      showToast("تم رفع الصورة ✓");
      return urlRes.data.publicUrl;
    } finally { setUploading(false); }
  }

  async function saveAdminSection(section, items) {
    setSaving(true);
    try {
      await supabase.from("admin_sections").delete().eq("section", section);
      var payload = [];
      for (var idx = 0; idx < items.length; idx++) {
        var i = items[idx];
        if (i.title || i.body || i.image_url || i.link_url) {
          payload.push({ section: section, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx, is_active: true });
        }
      }
      if (payload.length) {
        var ins = await supabase.from("admin_sections").insert(payload);
        if (ins.error) { showToast(ins.error.message, "error"); return; }
      }
      showToast("تم الحفظ بنجاح ✓");
    } finally { setSaving(false); }
  }

  function groupBySection(items) {
    var acc = {};
    for (var idx = 0; idx < items.length; idx++) {
      var s = items[idx].section;
      if (!acc[s]) acc[s] = [];
      acc[s].push(Object.assign({}, items[idx], { _key: items[idx].id || ++_itemId }));
    }
    return acc;
  }

  /* ===== تعيين كلمة مرور جديدة (بعد النقر على رابط إعادة التعيين) ===== */
  if (session && recoveryMode) {
    return (
      <div className="auth-page">
        <ToastContainer />
        <div className="auth-card">
          <div className="auth-logo">🔐</div>
          <div className="auth-title">تعيين كلمة مرور جديدة</div>
          <div className="auth-subtitle">أدخل كلمة المرور الجديدة لحساب الأدمن</div>
          {authMsg && <div className={"alert " + authMsg.type}>{authMsg.text}</div>}
          <div className="auth-form">
            <div className="field">
              <label>كلمة المرور الجديدة</label>
              <input type="password" placeholder="6 أحرف على الأقل" value={newPassword} onChange={function(e){setNewPassword(e.target.value);}} />
            </div>
            <div className="field">
              <label>تأكيد كلمة المرور</label>
              <input type="password" placeholder="أعد إدخال كلمة المرور" value={confirmPassword} onChange={function(e){setConfirmPassword(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")setNewPasswordSubmit();}} />
            </div>
          </div>
          <div className="auth-actions">
            <button className="btn-primary" onClick={setNewPasswordSubmit} disabled={authBusy}>{authBusy?"جاري الحفظ...":"حفظ كلمة المرور"}</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== LOGIN PAGE ===== */
  if (!session) {
    var isResetView = resetMode || resetSent;
    return (
      <div className="auth-page">
        <ToastContainer />
        <div className="auth-card">
          <div className="auth-logo">🕌</div>
          <div className="auth-title">لوحة تحكم الأدمن</div>
          <div className="auth-subtitle">
            {isResetView ? (resetSent ? "تحقق من بريدك ثم عد لتسجيل الدخول" : "أدخل بريدك لإرسال رابط إعادة تعيين كلمة المرور") : "سجّل دخولك بحساب أدمن لإدارة الإعلانات"}
          </div>
          {authMsg && <div className={"alert " + authMsg.type}>{authMsg.text}</div>}
          {!isResetView ? (
            <>
              <div className="auth-form">
                <div className="field">
                  <label>البريد الإلكتروني</label>
                  <input type="email" placeholder="name@example.com" value={email} onChange={function(e){setEmail(e.target.value); setAuthMsg(null);}} />
                </div>
                <div className="field">
                  <label>كلمة المرور</label>
                  <div className="pass-wrap">
                    <input type={showPass?"text":"password"} value={password} onChange={function(e){setPassword(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")signIn();}} />
                    <button type="button" className="pass-toggle" onClick={function(){setShowPass(!showPass);}}>{showPass?"إخفاء":"عرض"}</button>
                  </div>
                </div>
              </div>
              <div className="auth-actions">
                <button className="btn-primary" onClick={signIn} disabled={authBusy}>{authBusy?"جاري الدخول...":"تسجيل الدخول"}</button>
                <button type="button" className="btn-link" style={{marginTop:8}} onClick={function(){setResetMode(true); setAuthMsg(null);}}>نسيت كلمة المرور؟</button>
              </div>
            </>
          ) : resetSent ? (
            <div className="auth-actions">
              <button type="button" className="btn-link" onClick={function(){setResetSent(false); setResetMode(false); setResetEmail(""); setAuthMsg(null);}}>← رجوع لتسجيل الدخول</button>
            </div>
          ) : (
            <>
              <div className="auth-form">
                <div className="field">
                  <label>البريد الإلكتروني</label>
                  <input type="email" placeholder="name@example.com" value={resetEmail} onChange={function(e){setResetEmail(e.target.value); setAuthMsg(null);}} />
                </div>
              </div>
              <div className="auth-actions">
                <button className="btn-primary" onClick={sendResetPassword} disabled={authBusy}>{authBusy?"جاري الإرسال...":"إرسال رابط إعادة التعيين"}</button>
                <button type="button" className="btn-link" style={{marginTop:8}} onClick={function(){setResetMode(false); setAuthMsg(null);}}>← رجوع لتسجيل الدخول</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="auth-page">
        <ToastContainer />
        <div className="auth-card">
          <div className="auth-logo">⛔</div>
          <div className="auth-title">غير مصرح</div>
          <div className="auth-subtitle">هذا الحساب غير مسجل كأدمن</div>
          <div className="auth-actions">
            <button className="btn-primary" onClick={signOut}>تسجيل الخروج</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  return (
    <ErrorBoundary>
      <ToastContainer />
      <div className="app-header">
        <h1><span>🕌</span> لوحة تحكم الإعلانات</h1>
        <button className="btn-logout" onClick={signOut}>تسجيل الخروج ←</button>
      </div>
      <div className="container">
        <div className="card">
          <div className="card-title"><span className="icon">📢</span> إعلانات الأدمن (تظهر في التطبيق)</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>📐 المقاس المطلوب لصورة كل إعلان: <strong>360×140</strong> بكسل (أو 720×280 للوضوح)</div>
          <ListEditorWithDimensions items={adminAds} setter={setAdminAds} onUpload={uploadImage} uploading={uploading} dimensionsHint={AD_IMAGE_DIMENSIONS} />
          <div className="actions">
            <button className="btn-add" onClick={function(){setAdminAds(adminAds.concat([emptyItem()]));}}>+ إضافة إعلان</button>
            <button className="btn-save" onClick={function(){saveAdminSection(4, adminAds);}} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ الإعلانات"}</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><span className="icon">🔗</span> روابط التسويق</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>📐 المقاس المطلوب للصورة: <strong>360×140</strong> بكسل (أو 720×280 للوضوح)</div>
          <ListEditorWithDimensions items={marketing} setter={setMarketing} onUpload={uploadImage} uploading={uploading} dimensionsHint={AD_IMAGE_DIMENSIONS} />
          <div className="actions">
            <button className="btn-add" onClick={function(){setMarketing(marketing.concat([emptyItem()]));}}>+ إضافة رابط</button>
            <button className="btn-save" onClick={function(){saveAdminSection(5, marketing);}} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ الروابط"}</button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* ========== List Editor مع ذكر المقاس المطلوب ========== */
function ListEditorWithDimensions(props) {
  var items = props.items;
  var setter = props.setter;
  var onUpload = props.onUpload;
  var uploading = props.uploading;
  var dimensionsHint = props.dimensionsHint || AD_IMAGE_DIMENSIONS;
  function handleUpdate(index, field, value) {
    var updated = items.slice();
    updated[index] = Object.assign({}, updated[index]);
    updated[index][field] = value;
    setter(updated);
  }
  function handleRemove(index) {
    var updated = items.filter(function(_,i){return i!==index;});
    setter(updated.length ? updated : [emptyItem()]);
  }
  return (
    <div>
      {items.map(function(item, index) {
        return (
          <div className="list-item" key={item._key || index}>
            <div className="item-header">
              <span className="item-number">#{index + 1}</span>
              <button className="btn-danger" onClick={function(){handleRemove(index);}}>🗑 حذف</button>
            </div>
            <div className="row">
              <div style={{flex:1}}><label>العنوان</label><input value={item.title||""} onChange={function(e){handleUpdate(index,"title",e.target.value);}} /></div>
              <div style={{flex:1}}><label>رابط</label><input value={item.link_url||""} onChange={function(e){handleUpdate(index,"link_url",e.target.value);}} placeholder="https://..." /></div>
            </div>
            <div style={{marginTop:8}}>
              <label>صورة</label>
              <div className="row" style={{alignItems:"flex-end"}}>
                <div style={{flex:1}}>
                  <input value={item.image_url||""} onChange={function(e){handleUpdate(index,"image_url",e.target.value);}} placeholder="رابط الصورة أو ارفع ملف..." />
                </div>
                {onUpload && (
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <label className="btn-secondary" style={{display:"inline-block",padding:"10px 16px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",fontSize:13}}>
                      {uploading ? "جاري الرفع..." : "📷 رفع صورة"}
                      <input type="file" accept="image/*" style={{display:"none"}} disabled={uploading} onChange={async function(e) {
                        var file = e.target.files && e.target.files[0]; if (!file) return;
                        var url = await onUpload(file);
                        if (url) handleUpdate(index, "image_url", url);
                        e.target.value = "";
                      }} />
                    </label>
                    <span className="muted" style={{fontSize:11,whiteSpace:"nowrap"}}>المقاس المطلوب: {dimensionsHint}</span>
                  </div>
                )}
              </div>
              {item.image_url && <div className="img-preview"><img src={item.image_url} alt="" onError={function(e){e.target.parentNode.style.display="none";}} /></div>}
            </div>
            <div style={{marginTop:8}}><label>الوصف</label><textarea value={item.body||""} onChange={function(e){handleUpdate(index,"body",e.target.value);}} /></div>
          </div>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
