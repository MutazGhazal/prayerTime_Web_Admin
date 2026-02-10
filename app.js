const { useEffect, useState, useRef } = React;

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

/* ========== Helpers ========== */
let _itemId = 0;
const emptyItem = () => ({ _key: ++_itemId, title: "", body: "", image_url: "", link_url: "" });

/* ========== Toast System ========== */
let _toastList = [];
let _toastRender = null;
function showToast(msg, type = "success") {
  const id = Date.now();
  _toastList = [..._toastList, { id, msg, type }];
  if (_toastRender) _toastRender([..._toastList]);
  setTimeout(() => {
    _toastList = _toastList.filter((t) => t.id !== id);
    if (_toastRender) _toastRender([..._toastList]);
  }, 3000);
}
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _toastRender = setToasts;
  if (!toasts.length) return null;
  return React.createElement("div", { className: "toast-container" },
    toasts.map((t) => React.createElement("div", { key: t.id, className: `toast ${t.type}` }, t.msg))
  );
}

/* ========== Google SVG ========== */
const GoogleIcon = () => React.createElement("svg", { viewBox: "0 0 24 24", width: 20, height: 20 },
  React.createElement("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z", fill: "#4285F4" }),
  React.createElement("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }),
  React.createElement("path", { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }),
  React.createElement("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })
);

/* ========== Error Boundary ========== */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { className: "card", style: { textAlign: "center", padding: 40 } },
        React.createElement("p", null, "حدث خطأ غير متوقع"),
        React.createElement("p", { className: "muted" }, String(this.state.error)),
        React.createElement("button", { className: "btn-save", onClick: () => this.setState({ hasError: false }) }, "إعادة المحاولة")
      );
    }
    return this.props.children;
  }
}

/* ========== Main App ========== */
function App() {
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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
  const [recentClicks, setRecentClicks] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [newPurchase, setNewPurchase] = useState({ user_email: "", link_url: "", link_title: "", amount: "", notes: "", status: "confirmed" });

  if (!supabase) return React.createElement("div", { className: "auth-page" }, React.createElement("div", { className: "auth-card" }, "تعذر تشغيل لوحة الأدمن"));

  /* --- Auth --- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setAuthMsg({ type: "error", text: error.message });
      }).finally(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) { loadClients(); loadAdminSections(); loadReferrals(); loadAppUsers(); loadLinkStats(); loadRecentClicks(); loadPurchases(); } }, [session]);
  useEffect(() => { if (selectedSlug) { loadClientContent(selectedSlug); loadClientMeta(selectedSlug); } }, [selectedSlug]);
  useEffect(() => { if (selectedUserId) loadUserSections(selectedUserId); }, [selectedUserId]);

  async function signIn() {
    setAuthBusy(true); setAuthMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) setAuthMsg({ type: "error", text: error.message });
  }

  async function signInWithGoogle() {
    setAuthBusy(true); setAuthMsg(null);
    const redirectTo = config?.WEB_ADMIN_URL || `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    setAuthBusy(false);
    if (error) { setAuthMsg({ type: "error", text: error.message }); return; }
    if (data?.url) window.location.href = data.url;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setClients([]); setSelectedSlug(""); setAppUsers([]); setSelectedUserId("");
  }

  /* --- Load functions --- */
  async function loadClients() {
    const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (error) { showToast(error.message, "error"); return; }
    setClients(data || []);
    if (!selectedSlug && data?.length) setSelectedSlug(data[0].slug);
  }
  async function loadClientMeta(slug) {
    const { data } = await supabase.from("clients").select("*").eq("slug", slug).single();
    if (data) setClientMeta(data);
  }
  async function loadClientContent(slug) {
    const { data, error } = await supabase.from("client_sections").select("*").eq("client_slug", slug).order("sort_order", { ascending: true });
    if (error) { showToast(error.message, "error"); return; }
    const g = groupBySection(data || []);
    setSection1(g[1]?.[0] || emptyItem());
    setLinks(g[2] || [emptyItem()]);
    setOffers(g[3] || [emptyItem()]);
  }
  async function loadAdminSections() {
    const { data, error } = await supabase.from("admin_sections").select("*").order("sort_order", { ascending: true });
    if (error) { showToast(error.message, "error"); return; }
    const g = groupBySection(data || []);
    setAdminAds(g[4] || [emptyItem()]);
    setMarketingLinks(g[5] || [emptyItem()]);
  }
  async function loadReferrals() { const { data } = await supabase.from("referral_visits").select("*").order("created_at", { ascending: false }).limit(50); setReferrals(data || []); }
  async function loadAppUsers() {
    const { data } = await supabase.from("app_users").select("user_id,email,full_name,provider,last_login,created_at").order("last_login", { ascending: false });
    setAppUsers(data || []);
    if (!selectedUserId && data?.length) setSelectedUserId(data[0].user_id);
  }
  async function loadLinkStats() { const { data } = await supabase.from("link_stats").select("*").order("total_clicks", { ascending: false }).limit(50); if (data) setLinkStats(data); }
  async function loadRecentClicks() { const { data } = await supabase.from("link_clicks").select("*").order("created_at", { ascending: false }).limit(30); if (data) setRecentClicks(data); }
  async function loadPurchases() { const { data } = await supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(50); if (data) setPurchases(data); }
  async function loadUserSections(uid) {
    const { data, error } = await supabase.from("app_user_sections").select("*").eq("user_id", uid).order("sort_order", { ascending: true });
    if (error) { showToast(error.message, "error"); return; }
    setUserItems((data || []).length ? data : [emptyItem()]);
  }

  /* --- Save functions --- */
  async function saveClientMeta() {
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").update({ name: clientMeta.name, slug: clientMeta.slug, logo_url: clientMeta.logo_url, referral_code: clientMeta.referral_code, commission_rate: Number(clientMeta.commission_rate || 10) }).eq("slug", selectedSlug);
      if (error) { showToast(error.message, "error"); return; }
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
      const payload = userItems.filter(i => i.title || i.body || i.image_url || i.link_url).map((i, idx) => ({ user_id: selectedUserId, section: 1, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx }));
      if (payload.length) { const { error } = await supabase.from("app_user_sections").insert(payload); if (error) { showToast(error.message, "error"); return; } }
      showToast("تم حفظ محتوى المستخدم ✓");
    } finally { setSaving(false); }
  }
  async function addPurchase() {
    if (!newPurchase.user_email) { showToast("يرجى إدخال إيميل المستخدم", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("purchases").insert({ ...newPurchase, amount: parseFloat(newPurchase.amount) || 0, client_slug: selectedSlug, recorded_by: session?.user?.id });
      if (error) { showToast(error.message, "error"); return; }
      showToast("تم تسجيل الشراء ✓");
      setNewPurchase({ user_email: "", link_url: "", link_title: "", amount: "", notes: "", status: "confirmed" });
      loadPurchases();
    } finally { setSaving(false); }
  }

  async function saveListSection(slug, section, items) {
    await supabase.from("client_sections").delete().eq("client_slug", slug).eq("section", section);
    const payload = items.filter(i => i.title || i.body || i.image_url || i.link_url).map((i, idx) => ({ client_slug: slug, section, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx }));
    if (payload.length) { const { error } = await supabase.from("client_sections").insert(payload); if (error) showToast(error.message, "error"); }
  }
  async function saveAdminList(section, items) {
    await supabase.from("admin_sections").delete().eq("section", section);
    const payload = items.filter(i => i.title || i.body || i.image_url || i.link_url).map((i, idx) => ({ section, title: i.title, body: i.body, image_url: i.image_url, link_url: i.link_url, sort_order: idx, is_active: true }));
    if (payload.length) { const { error } = await supabase.from("admin_sections").insert(payload); if (error) showToast(error.message, "error"); }
  }

  function groupBySection(items) { return items.reduce((a, i) => { a[i.section] = a[i.section] || []; a[i.section].push(i); return a; }, {}); }
  function updateList(setter, list, idx, field, val) { const u = [...list]; u[idx] = { ...u[idx], [field]: val }; setter(u); }
  function addItem(setter, list) { setter([...list, emptyItem()]); }
  function removeItem(setter, list, idx) { const u = list.filter((_, i) => i !== idx); setter(u.length ? u : [emptyItem()]); }

  /* ===== LOGIN PAGE ===== */
  if (!session) {
    return (
      <div className="auth-page">
        <ToastContainer />
        <div className="auth-card">
          <div className="auth-logo">🕌</div>
          <div className="auth-title">لوحة تحكم الأدمن</div>
          <div className="auth-subtitle">سجّل دخولك لإدارة العملاء والمحتوى</div>

          {authMsg && <div className={`alert ${authMsg.type}`}>{authMsg.text}</div>}

          <div className="auth-form">
            <div className="field">
              <label>البريد الإلكتروني</label>
              <input type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <div className="pass-wrap">
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && signIn()} />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>{showPass ? "إخفاء" : "عرض"}</button>
              </div>
            </div>
          </div>

          <div className="auth-actions">
            <button className="btn-primary" onClick={signIn} disabled={authBusy}>{authBusy ? "جاري الدخول..." : "تسجيل الدخول"}</button>
          </div>

          <div className="auth-divider">أو</div>

          <button className="btn-google" onClick={signInWithGoogle} disabled={authBusy}>
            <GoogleIcon />
            المتابعة عبر Google
          </button>
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  const currentUser = appUsers.find(u => u.user_id === selectedUserId);
  return (
    <ErrorBoundary>
      <ToastContainer />
      <div className="app-header">
        <h1><span>🕌</span> لوحة تحكم أوقات الصلاة</h1>
        <button className="btn-logout" onClick={signOut}>تسجيل الخروج ←</button>
      </div>
      <div className="container">

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{clients.length}</div><div className="stat-label">العملاء</div></div>
          <div className="stat-card"><div className="stat-value">{appUsers.length}</div><div className="stat-label">المستخدمون</div></div>
          <div className="stat-card"><div className="stat-value">{linkStats.reduce((s, l) => s + (l.total_clicks || 0), 0)}</div><div className="stat-label">إجمالي النقرات</div></div>
          <div className="stat-card"><div className="stat-value">{referrals.length}</div><div className="stat-label">الإحالات</div></div>
        </div>

        {/* Client selector */}
        <div className="card">
          <div className="card-title"><span className="icon">👥</span> إدارة العملاء</div>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>اختيار العميل</label>
              <select value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
                {clients.map(c => <option key={c.slug} value={c.slug}>{c.name} ({c.slug})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>نسبة العمولة (%)</label>
              <input type="number" value={clientMeta.commission_rate || 10} onChange={e => setClientMeta({ ...clientMeta, commission_rate: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>كود الإحالة</label>
              <input value={clientMeta.referral_code || ""} onChange={e => setClientMeta({ ...clientMeta, referral_code: e.target.value })} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div style={{ flex: 1 }}><label>اسم العميل</label><input value={clientMeta.name || ""} onChange={e => setClientMeta({ ...clientMeta, name: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>اللوجو (رابط)</label><input value={clientMeta.logo_url || ""} onChange={e => setClientMeta({ ...clientMeta, logo_url: e.target.value })} /></div>
          </div>
          {clientMeta.logo_url && <div className="img-preview" style={{ marginTop: 8 }}><img src={clientMeta.logo_url} alt="logo" onError={e => e.target.style.display = "none"} /></div>}
          <div className="actions">
            <button className="btn-save" onClick={saveClientMeta} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ بيانات العميل"}</button>
          </div>
        </div>

        {/* Section 1 - Company */}
        <div className="card">
          <div className="card-title"><span className="icon">🏢</span> بيانات الشركة</div>
          <ContentEditor item={section1} onChange={setSection1} />
          <div className="actions"><button className="btn-save" onClick={saveSection1} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ"}</button></div>
        </div>

        {/* Section 2 - Links */}
        <div className="card">
          <div className="card-title"><span className="icon">🔗</span> روابط الشركة</div>
          <ListEditor items={links} setter={setLinks} showBody={false} />
          <div className="actions">
            <button className="btn-add" onClick={() => addItem(setLinks, links)}>+ إضافة رابط</button>
            <button className="btn-save" onClick={saveLinks} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ الروابط"}</button>
          </div>
        </div>

        {/* Section 3 - Offers */}
        <div className="card">
          <div className="card-title"><span className="icon">🎁</span> عروض الشركة</div>
          <ListEditor items={offers} setter={setOffers} showImage />
          <div className="actions">
            <button className="btn-add" onClick={() => addItem(setOffers, offers)}>+ إضافة عرض</button>
            <button className="btn-save" onClick={saveOffers} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ العروض"}</button>
          </div>
        </div>

        {/* Section 4 - Admin Ads */}
        <div className="card">
          <div className="card-title"><span className="icon">📢</span> إعلانات الأدمن</div>
          <ListEditor items={adminAds} setter={setAdminAds} showImage />
          <div className="actions">
            <button className="btn-add" onClick={() => addItem(setAdminAds, adminAds)}>+ إضافة إعلان</button>
            <button className="btn-save" onClick={saveAdminAds} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ الإعلانات"}</button>
          </div>
        </div>

        {/* Section 5 - Marketing Links */}
        <div className="card">
          <div className="card-title"><span className="icon">📣</span> روابط التسويق</div>
          <ListEditor items={marketingLinks} setter={setMarketingLinks} showBody={false} />
          <div className="actions">
            <button className="btn-add" onClick={() => addItem(setMarketingLinks, marketingLinks)}>+ إضافة رابط</button>
            <button className="btn-save" onClick={saveMarketingLinks} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ روابط التسويق"}</button>
          </div>
        </div>

        {/* App Users */}
        <div className="card">
          <div className="card-title"><span className="icon">👤</span> مستخدمو التطبيق</div>
          {appUsers.length === 0 && <div className="muted">لا يوجد مستخدمون حتى الآن.</div>}
          {appUsers.length > 0 && (
            <>
              <label>اختيار المستخدم</label>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                {appUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.email || u.full_name || u.user_id}</option>)}
              </select>
              {currentUser && (
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <span className="badge badge-blue">{currentUser.provider || "email"}</span>
                  <span className="muted">آخر دخول: {currentUser.last_login ? new Date(currentUser.last_login).toLocaleString() : "-"}</span>
                </div>
              )}
              <div className="card-title" style={{ marginTop: 16 }}><span className="icon">📝</span> محتوى المستخدم</div>
              <ListEditor items={userItems} setter={setUserItems} showImage />
              <div className="actions">
                <button className="btn-add" onClick={() => addItem(setUserItems, userItems)}>+ إضافة عنصر</button>
                <button className="btn-save" onClick={saveUserItems} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 حفظ محتوى المستخدم"}</button>
              </div>
            </>
          )}
        </div>

        {/* Purchases */}
        <div className="card">
          <div className="card-title"><span className="icon">💰</span> تسجيل شراء جديد</div>
          <div className="row">
            <div style={{ flex: 1 }}><label>إيميل المستخدم</label><input value={newPurchase.user_email} onChange={e => setNewPurchase({ ...newPurchase, user_email: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>عنوان الرابط</label><input value={newPurchase.link_title} onChange={e => setNewPurchase({ ...newPurchase, link_title: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>المبلغ</label><input type="number" value={newPurchase.amount} onChange={e => setNewPurchase({ ...newPurchase, amount: e.target.value })} /></div>
          </div>
          <div className="actions"><button className="btn-save" onClick={addPurchase} disabled={saving}>{saving ? "جاري الحفظ..." : "💾 تسجيل الشراء"}</button></div>
          {purchases.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead><tr><th>المستخدم</th><th>العنوان</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {purchases.slice(0, 10).map(p => (
                    <tr key={p.id}><td>{p.user_email}</td><td>{p.link_title}</td><td>{p.amount}</td><td className="muted">{new Date(p.created_at).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Referrals */}
        <div className="card">
          <div className="card-title"><span className="icon">🔄</span> سجل الإحالات <span className="badge badge-green">{referrals.length}</span></div>
          {referrals.length === 0 ? <div className="muted">لا توجد إحالات بعد.</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>الكود</th><th>العميل</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {referrals.slice(0, 15).map(r => (
                    <tr key={r.id}><td>{r.referral_code}</td><td>{r.referrer_client_slug || "-"}</td><td className="muted">{new Date(r.created_at).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Link Stats */}
        {linkStats.length > 0 && (
          <div className="card">
            <div className="card-title"><span className="icon">📊</span> إحصائيات الروابط</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>الرابط</th><th>العنوان</th><th>النقرات</th></tr></thead>
                <tbody>
                  {linkStats.slice(0, 15).map((s, i) => (
                    <tr key={i}><td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{s.link_url}</td><td>{s.link_title}</td><td><strong>{s.total_clicks}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}

/* ========== Content Editor (single item) ========== */
function ContentEditor({ item, onChange }) {
  return (
    <div>
      <div className="row">
        <div style={{ flex: 1 }}><label>العنوان</label><input value={item.title || ""} onChange={e => onChange({ ...item, title: e.target.value })} /></div>
        <div style={{ flex: 1 }}><label>رابط</label><input value={item.link_url || ""} onChange={e => onChange({ ...item, link_url: e.target.value })} placeholder="https://..." /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div style={{ flex: 1 }}><label>صورة (رابط)</label><input value={item.image_url || ""} onChange={e => onChange({ ...item, image_url: e.target.value })} placeholder="https://..." /></div>
      </div>
      {item.image_url && <div className="img-preview"><img src={item.image_url} alt="" onError={e => e.target.parentNode.style.display = "none"} /></div>}
      <div style={{ marginTop: 8 }}><label>النص / الوصف</label><textarea value={item.body || ""} onChange={e => onChange({ ...item, body: e.target.value })} /></div>
    </div>
  );
}

/* ========== List Editor ========== */
function ListEditor({ items, setter, showBody = true, showImage = true }) {
  return (
    <div>
      {items.map((item, index) => (
        <div className="list-item" key={item._key || index}>
          <div className="item-header">
            <span className="item-number">#{index + 1}</span>
            <button className="btn-danger" onClick={() => removeItem(setter, items, index)}>🗑 حذف</button>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}><label>العنوان</label><input value={item.title || ""} onChange={e => updateList(setter, items, index, "title", e.target.value)} /></div>
            <div style={{ flex: 1 }}><label>رابط</label><input value={item.link_url || ""} onChange={e => updateList(setter, items, index, "link_url", e.target.value)} placeholder="https://..." /></div>
          </div>
          {showImage && (
            <div style={{ marginTop: 8 }}>
              <label>صورة (رابط)</label>
              <input value={item.image_url || ""} onChange={e => updateList(setter, items, index, "image_url", e.target.value)} placeholder="https://..." />
              {item.image_url && <div className="img-preview"><img src={item.image_url} alt="" onError={e => e.target.parentNode.style.display = "none"} /></div>}
            </div>
          )}
          {showBody && (
            <div style={{ marginTop: 8 }}><label>الوصف</label><textarea value={item.body || ""} onChange={e => updateList(setter, items, index, "body", e.target.value)} /></div>
          )}
        </div>
      ))}
    </div>
  );
}

function updateList(setter, list, idx, field, val) { const u = [...list]; u[idx] = { ...u[idx], [field]: val }; setter(u); }
function removeItem(setter, list, idx) { const u = list.filter((_, i) => i !== idx); setter(u.length ? u : [emptyItem()]); }

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
