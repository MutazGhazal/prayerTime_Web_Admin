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

/* المقاس المطلوب للصور في البطاقات (يظهر في التطبيق بارتفاع 140) */
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

/* ========== Google Icon ========== */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
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
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
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
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [clientMeta, setClientMeta] = useState({ name: "", slug: "", logo_url: "", referral_code: "", commission_rate: 10 });
  const [section1, setSection1] = useState(emptyItem());
  const [links, setLinks] = useState([emptyItem()]);
  const [offers, setOffers] = useState([emptyItem()]);
  const [adminAds, setAdminAds] = useState([emptyItem()]);
  const [marketingLinks, setMarketingLinks] = useState([emptyItem()]);
  const [referrals, setReferrals] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userItems, setUserItems] = useState([emptyItem()]);
  const [linkStats, setLinkStats] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [newPurchase, setNewPurchase] = useState({ user_email: "", link_url: "", link_title: "", amount: "", notes: "", status: "confirmed" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewLocation, setPreviewLocation] = useState("عمان - وزارة الأوقاف");
  const [previewBgUrl, setPreviewBgUrl] = useState((config && config.PREVIEW_BG) || "https://images.unsplash.com/photo-1547970812-57d3e160046f?w=800");
  const [previewScale, setPreviewScale] = useState(0.58);
  const sectionRefs = { adminAds: React.useRef(null), userItems: React.useRef(null), clientMeta: React.useRef(null), section1: React.useRef(null), links: React.useRef(null), offers: React.useRef(null), marketingLinks: React.useRef(null) };
  var detailsRef = React.useRef(null);
  function scrollToSection(id) {
    var r = sectionRefs[id];
    if (r && r.current) {
      var el = r.current;
      var details = el.closest("details");
      if (details) details.setAttribute("open", "open");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (!supabase) {
    return <div className="auth-page"><div className="auth-card">تعذر تشغيل لوحة الأدمن</div></div>;
  }

  if (!authReady) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">🕌</div>
          <div className="auth-title">لوحة تحكم الأدمن</div>
          <div className="auth-subtitle" style={{ padding: "20px 0" }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    var resolved = false;
    function markReady(sess) {
      if (resolved) return;
      resolved = true;
      setSession(sess);
      setAuthReady(true);
    }
    var timeout = setTimeout(function() { markReady(null); }, 5000);
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(function(res) {
        if (res.error) setAuthMsg({ type: "error", text: res.error.message });
      }).finally(function() {
        window.history.replaceState({}, document.title, window.location.pathname);
        supabase.auth.getSession().then(function(res) {
          markReady(res.data.session);
          clearTimeout(timeout);
        }).catch(function() { markReady(null); clearTimeout(timeout); });
      });
    } else {
      supabase.auth.getSession().then(function(res) {
        markReady(res.data.session);
        clearTimeout(timeout);
      }).catch(function() { markReady(null); clearTimeout(timeout); });
    }
    var sub = supabase.auth.onAuthStateChange(function(_e, s) {
      if (!resolved) { resolved = true; clearTimeout(timeout); }
      setSession(s);
      setAuthReady(true);
    });
    return function() { clearTimeout(timeout); sub.data.subscription.unsubscribe(); };
  }, []);

  useEffect(function() {
    if (session) {
      checkIsAdmin();
      loadClients();
      loadReferrals();
      loadAppUsers();
      loadLinkStats();
      loadPurchases();
    }
  }, [session]);
  useEffect(function() { if (session && isAdmin) loadAdminSections(); }, [session, isAdmin]);

  async function checkIsAdmin() {
    if (!session || !session.user) { setIsAdmin(false); return; }
    var res = await supabase.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setIsAdmin(!!res.data);
  }
  useEffect(function() { if (selectedSlug) { loadClientContent(selectedSlug); loadClientMeta(selectedSlug); } }, [selectedSlug]);
  useEffect(function() { if (selectedUserId) loadUserSections(selectedUserId); }, [selectedUserId]);

  async function signIn() {
    setAuthBusy(true); setAuthMsg(null);
    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    setAuthBusy(false);
    if (res.error) setAuthMsg({ type: "error", text: res.error.message });
  }

  async function signInWithGoogle() {
    setAuthBusy(true); setAuthMsg(null);
    var redirectTo = config.WEB_ADMIN_URL || (window.location.origin + window.location.pathname);
    var res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo, skipBrowserRedirect: true },
    });
    setAuthBusy(false);
    if (res.error) { setAuthMsg({ type: "error", text: res.error.message }); return; }
    if (res.data && res.data.url) window.location.href = res.data.url;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setClients([]); setSelectedSlug(""); setAppUsers([]); setSelectedUserId("");
  }

  async function resetPassword() {
    var em = email.trim();
    if (!em) { showToast("يرجى إدخال بريدك الإلكتروني أولاً", "error"); return; }
    setAuthBusy(true); setAuthMsg(null);
    var res = await supabase.auth.resetPasswordForEmail(em);
    setAuthBusy(false);
    if (res.error) { setAuthMsg({ type: "error", text: res.error.message }); return; }
    showToast("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك ✓");
    setShowForgotPw(false);
  }

  async function uploadImage(file) {
    var bucket = (config && config.BUCKET) ? config.BUCKET : "uploads";
    if (!file) return "";
    setUploading(true);
    try {
      var ext = (file.name && file.name.split(".").pop()) || "jpg";
      var path = "admin/" + Date.now() + "." + ext;
      var res = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (res.error) { showToast("خطأ رفع: " + res.error.message, "error"); return ""; }
      var urlRes = supabase.storage.from(bucket).getPublicUrl(path);
      showToast("تم رفع الصورة ✓");
      return urlRes.data.publicUrl;
    } finally { setUploading(false); }
  }

  async function loadClients() {
    var res = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setClients(res.data || []);
    if (!selectedSlug && res.data && res.data.length) setSelectedSlug(res.data[0].slug);
  }
  async function loadClientMeta(slug) {
    var res = await supabase.from("clients").select("*").eq("slug", slug).single();
    if (res.data) setClientMeta(res.data);
  }
  async function loadClientContent(slug) {
    var res = await supabase.from("client_sections").select("*").eq("client_slug", slug).order("sort_order", { ascending: true });
    if (res.error) { showToast(res.error.message, "error"); return; }
    var g = groupBySection(res.data || []);
    setSection1(g[1] && g[1][0] ? g[1][0] : emptyItem());
    setLinks(g[2] || [emptyItem()]);
    setOffers(g[3] || [emptyItem()]);
  }
  async function loadAdminSections() {
    var res = await supabase.from("admin_sections").select("*").order("sort_order", { ascending: true });
    if (res.error) { showToast(res.error.message, "error"); return; }
    var g = groupBySection(res.data || []);
    setAdminAds(g[4] || [emptyItem()]);
    setMarketingLinks(g[5] || [emptyItem()]);
  }
  async function loadReferrals() { var res = await supabase.from("referral_visits").select("*").order("created_at", { ascending: false }).limit(50); setReferrals(res.data || []); }
  async function loadAppUsers() {
    var res = await supabase.from("app_users").select("user_id,email,full_name,provider,last_login,created_at").order("last_login", { ascending: false });
    setAppUsers(res.data || []);
    if (!selectedUserId && res.data && res.data.length) setSelectedUserId(res.data[0].user_id);
  }
  async function loadLinkStats() { var res = await supabase.from("link_stats").select("*").order("total_clicks", { ascending: false }).limit(50); if (res.data) setLinkStats(res.data); }
  async function loadPurchases() { var res = await supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(50); if (res.data) setPurchases(res.data); }
  async function loadUserSections(uid) {
    var res = await supabase.from("app_user_sections").select("*").eq("user_id", uid).order("sort_order", { ascending: true });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setUserItems((res.data || []).length ? res.data : [emptyItem()]);
  }

  async function saveClientMeta() {
    setSaving(true);
    try {
      var res = await supabase.from("clients").update({ name: clientMeta.name, slug: clientMeta.slug, logo_url: clientMeta.logo_url, referral_code: clientMeta.referral_code, commission_rate: Number(clientMeta.commission_rate || 10) }).eq("slug", selectedSlug);
      if (res.error) { showToast(res.error.message, "error"); return; }
      showToast("تم حفظ بيانات العميل ✓"); loadClients();
    } finally { setSaving(false); }
  }
  async function saveSection1() { setSaving(true); try { await saveListSection(selectedSlug, 1, [section1]); showToast("تم حفظ قسم الشركة ✓"); } finally { setSaving(false); } }
  async function saveLinks() { setSaving(true); try { await saveListSection(selectedSlug, 2, links); showToast("تم حفظ الروابط ✓"); } finally { setSaving(false); } }
  async function saveOffers() { setSaving(true); try { await saveListSection(selectedSlug, 3, offers); showToast("تم حفظ العروض ✓"); } finally { setSaving(false); } }
  async function saveAdminAds() { setSaving(true); try { await saveAdminList(4, adminAds); showToast("تم حفظ الإعلانات ✓"); } finally { setSaving(false); } }
  async function saveMarketingLinks() { setSaving(true); try { await saveAdminList(5, marketingLinks); showToast("تم حفظ روابط التسويق ✓"); } finally { setSaving(false); } }
  async function saveUserItems() {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await supabase.from("app_user_sections").delete().eq("user_id", selectedUserId);
      var payload = [];
      for (var idx = 0; idx < userItems.length; idx++) {
        var i = userItems[idx];
        if (i.title || i.body || i.image_url || i.link_url) {
          payload.push({ user_id: selectedUserId, section: 1, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx });
        }
      }
      if (payload.length) { var res = await supabase.from("app_user_sections").insert(payload); if (res.error) { showToast(res.error.message, "error"); return; } }
      showToast("تم حفظ محتوى المستخدم ✓");
    } finally { setSaving(false); }
  }
  async function addPurchase() {
    if (!newPurchase.user_email) { showToast("يرجى إدخال إيميل المستخدم", "error"); return; }
    setSaving(true);
    try {
      var res = await supabase.from("purchases").insert({ user_email: newPurchase.user_email, link_url: newPurchase.link_url, link_title: newPurchase.link_title, amount: parseFloat(newPurchase.amount) || 0, notes: newPurchase.notes, status: newPurchase.status, client_slug: selectedSlug, recorded_by: session && session.user ? session.user.id : null });
      if (res.error) { showToast(res.error.message, "error"); return; }
      showToast("تم تسجيل الشراء ✓");
      setNewPurchase({ user_email: "", link_url: "", link_title: "", amount: "", notes: "", status: "confirmed" });
      loadPurchases();
    } finally { setSaving(false); }
  }

  async function saveListSection(slug, section, items) {
    await supabase.from("client_sections").delete().eq("client_slug", slug).eq("section", section);
    var payload = [];
    for (var idx = 0; idx < items.length; idx++) {
      var i = items[idx];
      if (i.title || i.body || i.image_url || i.link_url) {
        payload.push({ client_slug: slug, section: section, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx });
      }
    }
    if (payload.length) { var res = await supabase.from("client_sections").insert(payload); if (res.error) showToast(res.error.message, "error"); }
  }
  async function saveAdminList(section, items) {
    await supabase.from("admin_sections").delete().eq("section", section);
    var payload = [];
    for (var idx = 0; idx < items.length; idx++) {
      var i = items[idx];
      if (i.title || i.body || i.image_url || i.link_url) {
        payload.push({ section: section, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx, is_active: true });
      }
    }
    if (payload.length) { var res = await supabase.from("admin_sections").insert(payload); if (res.error) showToast(res.error.message, "error"); }
  }

  function groupBySection(items) {
    var acc = {};
    for (var idx = 0; idx < items.length; idx++) {
      var s = items[idx].section;
      if (!acc[s]) acc[s] = [];
      acc[s].push(items[idx]);
    }
    return acc;
  }

  /* ===== LOGIN PAGE ===== */
  if (!session) {
    return (
      <div className="auth-page">
        <ToastContainer />
        <div className="auth-card">
          <div className="auth-logo">🕌</div>
          <div className="auth-title">لوحة تحكم الأدمن</div>
          <div className="auth-subtitle">سجّل دخولك لإدارة العملاء والمحتوى</div>
          {authMsg && <div className={"alert " + authMsg.type}>{authMsg.text}</div>}
          {showForgotPw ? (
            <div className="auth-form">
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:36,marginBottom:8}}>🔑</div>
                <div style={{fontWeight:700,fontSize:16}}>استعادة كلمة المرور</div>
                <div className="muted" style={{marginTop:4,fontSize:13}}>أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة التعيين</div>
              </div>
              <div className="field">
                <label>البريد الإلكتروني</label>
                <input type="email" placeholder="admin@example.com" value={email} onChange={function(e){setEmail(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")resetPassword();}} />
              </div>
              <div className="auth-actions">
                <button className="btn-primary" onClick={resetPassword} disabled={authBusy}>{authBusy ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</button>
              </div>
              <div style={{textAlign:"center",marginTop:12}}>
                <button className="btn-link" onClick={function(){setShowForgotPw(false);setAuthMsg(null);}}>← العودة لتسجيل الدخول</button>
              </div>
            </div>
          ) : (
          <div className="auth-form">
            <div className="field">
              <label>البريد الإلكتروني</label>
              <input type="email" placeholder="admin@example.com" value={email} onChange={function(e) { setEmail(e.target.value); }} />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <div className="pass-wrap">
                <input type={showPass ? "text" : "password"} value={password} onChange={function(e) { setPassword(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") signIn(); }} />
                <button type="button" className="pass-toggle" onClick={function() { setShowPass(!showPass); }}>{showPass ? "إخفاء" : "عرض"}</button>
              </div>
            </div>
            <div style={{textAlign:"right",marginTop:4}}>
              <button className="btn-link" onClick={function(){setShowForgotPw(true);setAuthMsg(null);}}>نسيت كلمة المرور؟</button>
            </div>
          </div>
          )}
          {!showForgotPw && (
          <div>
          <div className="auth-actions">
            <button className="btn-primary" onClick={signIn} disabled={authBusy}>{authBusy ? "جاري الدخول..." : "تسجيل الدخول"}</button>
          </div>
          <div className="auth-divider">أو</div>
          <button className="btn-google" onClick={signInWithGoogle} disabled={authBusy}>
            <GoogleIcon />
            المتابعة عبر Google
          </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  var currentUser = null;
  for (var ui = 0; ui < appUsers.length; ui++) { if (appUsers[ui].user_id === selectedUserId) { currentUser = appUsers[ui]; break; } }
  return (
    <ErrorBoundary>
      <ToastContainer />
      <div className="app-header">
        <h1><span>🕌</span> لوحة تحكم أوقات الصلاة</h1>
        <button className="btn-logout" onClick={signOut}>تسجيل الخروج ←</button>
      </div>
      <div className="container">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{appUsers.length}</div><div className="stat-label">المستخدمون</div></div>
          <div className="stat-card"><div className="stat-value">{adminAds.filter(function(i){return i.title||i.body||i.image_url||i.link_url;}).length}</div><div className="stat-label">إعلانات الأدمن</div></div>
          <div className="stat-card"><div className="stat-value">{referrals.length}</div><div className="stat-label">الإحالات</div></div>
        </div>

        <AppLivePreview
          clientMeta={clientMeta}
          section1={section1}
          adminAds={adminAds}
          userItems={userItems}
          marketingLinks={marketingLinks}
          selectedSlug={selectedSlug}
          scrollToSection={scrollToSection}
          previewLocation={previewLocation}
          setPreviewLocation={setPreviewLocation}
          previewBgUrl={previewBgUrl}
          setPreviewBgUrl={setPreviewBgUrl}
          previewScale={previewScale}
          setPreviewScale={setPreviewScale}
        />

        <div className="card mirror-banner">
          <div className="muted" style={{fontSize:13}}>📱 انقر على أي عنصر في المعاينة للانتقال لتحريره. المحتوى أدناه مرتبط مباشرة بما يراه المستخدم في التطبيق.</div>
        </div>

        {isAdmin && (
        <div className="card" ref={sectionRefs.adminAds}>
          <div className="card-title"><span className="icon">📢</span> إعلانات الأدمن <span className="badge badge-green">(للدمن فقط — حتى 5)</span></div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>📐 المقاس المطلوب لصورة كل إعلان: <strong>360×140</strong> بكسل (أو 720×280 للوضوح)</div>
          <ListEditor items={adminAds} setter={setAdminAds} showBody={true} showImage={true} maxItems={5} onUpload={uploadImage} uploading={uploading} dimensionsHint={AD_IMAGE_DIMENSIONS} />
          <div className="actions">
            <button className="btn-add" onClick={function(){if(adminAds.length<5)setAdminAds(adminAds.concat([emptyItem()]));}} disabled={adminAds.length>=5}>+ إضافة إعلان</button>
            <button className="btn-save" onClick={saveAdminAds} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ الإعلانات"}</button>
          </div>
        </div>
        )}

        <div className="card" ref={sectionRefs.userItems}>
          <div className="card-title"><span className="icon">👤</span> إعلانات للمستخدم <span className="badge badge-blue">(مخصصة لكل مستخدم — حتى 3)</span></div>
          {appUsers.length === 0 ? <div className="muted">لا يوجد مستخدمون. عند تسجيل المستخدمين في التطبيق سيظهرون هنا.</div> : (
            <div>
              <label>اختيار المستخدم</label>
              <select value={selectedUserId} onChange={function(e){setSelectedUserId(e.target.value);}}>
                {appUsers.map(function(u){return <option key={u.user_id} value={u.user_id}>{u.email||u.full_name||u.user_id}</option>;})}
              </select>
              {currentUser && <div style={{display:"flex",gap:12,marginTop:8}}><span className="badge badge-blue">{currentUser.provider||"email"}</span><span className="muted">آخر دخول: {currentUser.last_login?new Date(currentUser.last_login).toLocaleString():"-"}</span></div>}
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>📐 المقاس المطلوب للصورة: <strong>360×140</strong> بكسل (أو 720×280 للوضوح)</div>
              <ListEditor items={userItems} setter={setUserItems} showBody={true} showImage={true} maxItems={3} onUpload={uploadImage} uploading={uploading} dimensionsHint={AD_IMAGE_DIMENSIONS} />
              <div className="actions">
                <button className="btn-add" onClick={function(){if(userItems.length<3)setUserItems(userItems.concat([emptyItem()]));}} disabled={userItems.length>=3}>+ إضافة عنصر</button>
                <button className="btn-save" onClick={saveUserItems} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ محتوى المستخدم"}</button>
              </div>
            </div>
          )}
        </div>

        <details className="card" ref={detailsRef}>
          <summary className="card-title" style={{cursor:"pointer"}}><span className="icon">⚙️</span> إعدادات إضافية (عملاء، شركة، روابط)</summary>
          <div style={{marginTop:16}}>
        <div className="card" style={{marginTop:16}} ref={sectionRefs.clientMeta}>
          <div className="card-title"><span className="icon">👥</span> إدارة العملاء</div>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>اختيار العميل</label>
              <select value={selectedSlug} onChange={function(e){setSelectedSlug(e.target.value);}}>
                {clients.map(function(c){return <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>;})}
              </select>
            </div>
            <div style={{ flex: 1 }}><label>نسبة العمولة (%)</label><input type="number" value={clientMeta.commission_rate||10} onChange={function(e){setClientMeta(Object.assign({},clientMeta,{commission_rate:e.target.value}));}} /></div>
            <div style={{ flex: 1 }}><label>كود الإحالة</label><input value={clientMeta.referral_code||""} onChange={function(e){setClientMeta(Object.assign({},clientMeta,{referral_code:e.target.value}));}} /></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div style={{ flex: 1 }}><label>اسم العميل</label><input value={clientMeta.name||""} onChange={function(e){setClientMeta(Object.assign({},clientMeta,{name:e.target.value}));}} /></div>
            <div style={{ flex: 1 }}><label>اللوجو (رابط)</label><input value={clientMeta.logo_url||""} onChange={function(e){setClientMeta(Object.assign({},clientMeta,{logo_url:e.target.value}));}} /></div>
          </div>
          {clientMeta.logo_url && <div className="img-preview" style={{marginTop:8}}><img src={clientMeta.logo_url} alt="logo" onError={function(e){e.target.style.display="none";}} /></div>}
          <div className="actions"><button className="btn-save" onClick={saveClientMeta} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ بيانات العميل"}</button></div>
        </div>

        <div className="card" style={{marginTop:16}} ref={sectionRefs.section1}>
          <div className="card-title"><span className="icon">🏢</span> بيانات الشركة</div>
          <ContentEditor item={section1} onChange={setSection1} />
          <div className="actions"><button className="btn-save" onClick={saveSection1} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ"}</button></div>
        </div>

        <div className="card" ref={sectionRefs.links}>
          <div className="card-title"><span className="icon">🔗</span> روابط الشركة</div>
          <ListEditor items={links} setter={setLinks} showBody={false} showImage={false} />
          <div className="actions">
            <button className="btn-add" onClick={function(){setLinks(links.concat([emptyItem()]));}}>+ إضافة رابط</button>
            <button className="btn-save" onClick={saveLinks} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ الروابط"}</button>
          </div>
        </div>

        <div className="card" ref={sectionRefs.offers}>
          <div className="card-title"><span className="icon">🎁</span> عروض الشركة</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>📐 المقاس المطلوب لصورة كل عرض: <strong>360×140</strong> بكسل (أو 720×280 للوضوح)</div>
          <ListEditor items={offers} setter={setOffers} showBody={true} showImage={true} onUpload={uploadImage} uploading={uploading} dimensionsHint={AD_IMAGE_DIMENSIONS} />
          <div className="actions">
            <button className="btn-add" onClick={function(){setOffers(offers.concat([emptyItem()]));}}>+ إضافة عرض</button>
            <button className="btn-save" onClick={saveOffers} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ العروض"}</button>
          </div>
        </div>

        <div className="card" style={{marginTop:16}} ref={sectionRefs.marketingLinks}>
          <div className="card-title"><span className="icon">📣</span> روابط التسويق</div>
          <ListEditor items={marketingLinks} setter={setMarketingLinks} showBody={false} showImage={false} />
          <div className="actions">
            <button className="btn-add" onClick={function(){setMarketingLinks(marketingLinks.concat([emptyItem()]));}}>+ إضافة رابط</button>
            <button className="btn-save" onClick={saveMarketingLinks} disabled={saving}>{saving?"جاري الحفظ...":"💾 حفظ روابط التسويق"}</button>
          </div>
        </div>
          </div>
        </details>

        <div className="card">
          <div className="card-title"><span className="icon">💰</span> تسجيل شراء جديد</div>
          <div className="row">
            <div style={{flex:1}}><label>إيميل المستخدم</label><input value={newPurchase.user_email} onChange={function(e){setNewPurchase(Object.assign({},newPurchase,{user_email:e.target.value}));}} /></div>
            <div style={{flex:1}}><label>عنوان الرابط</label><input value={newPurchase.link_title} onChange={function(e){setNewPurchase(Object.assign({},newPurchase,{link_title:e.target.value}));}} /></div>
            <div style={{flex:1}}><label>المبلغ</label><input type="number" value={newPurchase.amount} onChange={function(e){setNewPurchase(Object.assign({},newPurchase,{amount:e.target.value}));}} /></div>
          </div>
          <div className="actions"><button className="btn-save" onClick={addPurchase} disabled={saving}>{saving?"جاري الحفظ...":"💾 تسجيل الشراء"}</button></div>
          {purchases.length > 0 && (
            <div className="table-wrap" style={{marginTop:12}}>
              <table><thead><tr><th>المستخدم</th><th>العنوان</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
              <tbody>{purchases.slice(0,10).map(function(p){return <tr key={p.id}><td>{p.user_email}</td><td>{p.link_title}</td><td>{p.amount}</td><td className="muted">{new Date(p.created_at).toLocaleDateString()}</td></tr>;})}</tbody></table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><span className="icon">🔄</span> سجل الإحالات <span className="badge badge-green">{referrals.length}</span></div>
          {referrals.length === 0 ? <div className="muted">لا توجد إحالات بعد.</div> : (
            <div className="table-wrap"><table><thead><tr><th>الكود</th><th>العميل</th><th>التاريخ</th></tr></thead>
            <tbody>{referrals.slice(0,15).map(function(r){return <tr key={r.id}><td>{r.referral_code}</td><td>{r.referrer_client_slug||"-"}</td><td className="muted">{new Date(r.created_at).toLocaleString()}</td></tr>;})}</tbody></table></div>
          )}
        </div>

        {linkStats.length > 0 && (
          <div className="card">
            <div className="card-title"><span className="icon">📊</span> إحصائيات الروابط</div>
            <div className="table-wrap"><table><thead><tr><th>الرابط</th><th>العنوان</th><th>النقرات</th></tr></thead>
            <tbody>{linkStats.slice(0,15).map(function(s,i){return <tr key={i}><td className="muted" style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis"}}>{s.link_url}</td><td>{s.link_title}</td><td><strong>{s.total_clicks}</strong></td></tr>;})}</tbody></table></div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/* ========== App Live Preview ========== */
function AppLivePreview(props) {
  var clientMeta = props.clientMeta || {};
  var section1 = props.section1 || emptyItem();
  var adminAds = props.adminAds || [];
  var userItems = props.userItems || [];
  var marketingLinks = props.marketingLinks || [];
  var scrollToSection = props.scrollToSection || function(){};
  var previewLocation = props.previewLocation || "عمان - وزارة الأوقاف";
  var setPreviewLocation = props.setPreviewLocation || function(){};
  var previewBgUrl = props.previewBgUrl || (config && config.PREVIEW_BG) || "https://images.unsplash.com/photo-1547970812-57d3e160046f?w=800";
  var setPreviewBgUrl = props.setPreviewBgUrl || function(){};
  var scale = props.previewScale ?? 0.58;
  var setPreviewScale = props.setPreviewScale || function(){};
  var w = 360 * scale;
  var h = 640 * scale;
  var bgUrl = previewBgUrl;
  var hasContent = function(i){ return i && (i.title || i.body || i.image_url || i.link_url); };
  var userList = userItems.filter(hasContent);
  var adminList = adminAds.filter(hasContent).slice(0, 5);
  var ordered = [];
  if (adminList[3]) ordered.push({ item: adminList[3], type: "admin", idx: 3 });
  if (userList[2]) ordered.push({ item: userList[2], type: "user", idx: 2 });
  if (userList[1]) ordered.push({ item: userList[1], type: "user", idx: 1 });
  if (adminList[2]) ordered.push({ item: adminList[2], type: "admin", idx: 2 });
  if (adminList[1]) ordered.push({ item: adminList[1], type: "admin", idx: 1 });
  if (adminList[0]) ordered.push({ item: adminList[0], type: "admin", idx: 0 });
  if (adminList[4]) ordered.push({ item: adminList[4], type: "admin", idx: 4 });
  var now = new Date();
  var mockTimes = [{ n: "الفجر", t: "5:30" }, { n: "الشروق", t: "7:00" }, { n: "الظهر", t: "12:30" }, { n: "العصر", t: "3:45" }, { n: "المغرب", t: "6:15" }, { n: "العشاء", t: "7:45" }];
  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-title"><span className="icon">📱</span> معاينة حية للتطبيق <span className="badge badge-green">انقر على أي عنصر للتحرير</span></div>
      <div className="app-preview-wrap">
        <div className="app-preview-phone" style={{ width: w + 24, height: h + 60 }}>
          <div className="app-preview-screen" style={{ width: w, height: h }}>
            <div className="app-preview-bg" style={{ backgroundImage: "url(" + bgUrl + ")" }} />
            <div className="app-preview-overlay" />
            <div className="app-preview-content" style={{ fontSize: 11 * scale }}>
              <div className="app-preview-header" onClick={function(){scrollToSection("clientMeta");}} title="تحرير: اللوجو والعنوان">
                {clientMeta.logo_url ? <img src={clientMeta.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }} /> : <span style={{ fontSize: 18 }}>🕌</span>}
                <span style={{ flex: 1, textAlign: "center", fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{clientMeta.name || "أوقات الصلاة"}</span>
              </div>
              <div className="app-preview-body">
                {userList[0] && (
                  <div className="app-preview-card" onClick={function(){scrollToSection("userItems");}} title="تحرير: إعلان المستخدم 1">
                    {userList[0].image_url && <img src={userList[0].image_url} alt="" style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6 }} />}
                    {userList[0].title && <div style={{ padding: "4px 8px", background: "rgba(0,0,0,0.5)", color: "#fff", borderRadius: 4, marginTop: 4, fontSize: 10 }}>{userList[0].title}</div>}
                  </div>
                )}
                <div className="app-preview-card" style={{ padding: "8px 12px", background: "rgba(0,0,0,0.5)", borderRadius: 8 }} onClick={function(e){e.stopPropagation();}} title="تحرير: نص الموقع">
                  <input type="text" value={previewLocation} onChange={function(e){setPreviewLocation(e.target.value);}} placeholder="الموقع" style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, padding: 0, marginBottom: 2 }} />
                  <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 10 }}>{now.toLocaleDateString("ar")} | {now.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="app-preview-card" style={{ padding: "8px 12px", background: "rgba(110,0,26,0.7)", borderRadius: 8 }}>
                  <div style={{ color: "#fff", fontSize: 10 }}>الصلاة القادمة</div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>المغرب • 2س 30د</div>
                </div>
                <div className="app-preview-card" style={{ padding: "6px 10px", background: "rgba(0,0,0,0.5)", borderRadius: 8 }}>
                  {mockTimes.map(function(m, i){ return <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: 10, padding: "2px 0" }}><span>{m.n}</span><span>{m.t}</span></div>; })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <div className="app-preview-btn" style={{ flex: 1, padding: "6px 10px", background: "#2E7D32", color: "#fff", borderRadius: 8, fontSize: 9, textAlign: "center" }}>مشاركة حالة اليوم</div>
                  <div className="app-preview-btn" style={{ flex: 1, padding: "6px 10px", border: "1px solid #fff", color: "#fff", borderRadius: 8, fontSize: 9, textAlign: "center" }}>التذكير بالصلاة</div>
                </div>
                <div className="app-preview-ads" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginTop: 8 }}>
                  {ordered.slice(0, 6).map(function(o, i){
                    return (
                      <div key={i} className="app-preview-ad" onClick={function(){ scrollToSection(o.type === "admin" ? "adminAds" : "userItems"); }} title={(o.type === "admin" ? "إعلان أدمن " : "إعلان مستخدم ") + (o.idx + 1)}>
                        {o.item.image_url ? <img src={o.item.image_url} alt="" style={{ width: "100%", height: 50, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ width: "100%", height: 50, background: "rgba(0,0,0,0.3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.7)", fontSize: 9 }}>إعلان {i+1}</div>}
                        {o.item.title && <div style={{ fontSize: 8, color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 2 }}>{o.item.title}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="app-preview-legend" style={{ maxWidth: 400 }}>
          <p className="muted" style={{ margin: "0 0 8px 0", fontSize: 12 }}>نسخة حية مصغرة. انقر على اللوجو/العنوان أو الإعلانات للانتقال لتحريرها. يمكنك تعديل نص الموقع مباشرةً أعلاه.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <label style={{ fontSize: 11 }}>مقياس العرض:</label>
            <select value={scale} onChange={function(e){ setPreviewScale(parseFloat(e.target.value)); }} style={{ fontSize: 11, padding: 4 }}>
              <option value="0.45">صغير جداً</option>
              <option value="0.58">صغير</option>
              <option value="0.7">متوسط</option>
              <option value="0.85">كبير</option>
              <option value="1">كامل</option>
            </select>
            <label style={{ fontSize: 11 }}>خلفية:</label>
            <input type="text" value={previewBgUrl} onChange={function(e){ setPreviewBgUrl(e.target.value); }} placeholder="رابط الصورة" style={{ flex: 1, minWidth: 120, fontSize: 11, padding: 6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== Content Editor ========== */
function ContentEditor(props) {
  var item = props.item;
  var onChange = props.onChange;
  return (
    <div>
      <div className="row">
        <div style={{flex:1}}><label>العنوان</label><input value={item.title||""} onChange={function(e){onChange(Object.assign({},item,{title:e.target.value}));}} /></div>
        <div style={{flex:1}}><label>رابط</label><input value={item.link_url||""} onChange={function(e){onChange(Object.assign({},item,{link_url:e.target.value}));}} placeholder="https://..." /></div>
      </div>
      <div className="row" style={{marginTop:8}}>
        <div style={{flex:1}}><label>صورة (رابط)</label><input value={item.image_url||""} onChange={function(e){onChange(Object.assign({},item,{image_url:e.target.value}));}} placeholder="https://..." /></div>
      </div>
      {item.image_url && <div className="img-preview"><img src={item.image_url} alt="" onError={function(e){e.target.parentNode.style.display="none";}} /></div>}
      <div style={{marginTop:8}}><label>النص / الوصف</label><textarea value={item.body||""} onChange={function(e){onChange(Object.assign({},item,{body:e.target.value}));}} /></div>
    </div>
  );
}

/* ========== List Editor ========== */
function ListEditor(props) {
  var items = props.items;
  var setter = props.setter;
  var showBody = props.showBody !== false;
  var showImage = props.showImage !== false;
  var maxItems = props.maxItems;
  var onUpload = props.onUpload;
  var uploading = props.uploading === true;
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
      {(maxItems ? items.slice(0, maxItems) : items).map(function(item, index) {
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
            {showImage && (
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
                      <span className="muted" style={{fontSize:11,whiteSpace:"nowrap"}}>المقاس: {dimensionsHint}</span>
                    </div>
                  )}
                </div>
                {item.image_url && <div className="img-preview"><img src={item.image_url} alt="" onError={function(e){e.target.parentNode.style.display="none";}} /></div>}
              </div>
            )}
            {showBody && (
              <div style={{marginTop:8}}><label>الوصف</label><textarea value={item.body||""} onChange={function(e){handleUpdate(index,"body",e.target.value);}} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
