const { useEffect, useState } = React;

const config = window.APP_CONFIG;
if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  document.getElementById("root").innerHTML =
    "<div class='container'><div class='card'>يرجى إنشاء ملف config.js وتعبئة SUPABASE_URL و SUPABASE_ANON_KEY</div></div>";
}
if (!window.supabase) {
  document.getElementById("root").innerHTML =
    "<div class='container'><div class='card'>تعذر تحميل مكتبة Supabase. تأكد من اتصال الإنترنت.</div></div>";
}
const supabase = window.supabase
  ? window.supabase.createClient(
      config?.SUPABASE_URL,
      config?.SUPABASE_ANON_KEY
    )
  : null;

let _itemId = 0;
const emptyItem = () => ({
  _key: ++_itemId,
  title: "",
  body: "",
  image_url: "",
  link_url: "",
});

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [clientMeta, setClientMeta] = useState({
    name: "",
    slug: "",
    logo_url: "",
    referral_code: "",
    commission_rate: 10,
  });

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
  const [newPurchase, setNewPurchase] = useState({
    user_email: "",
    link_url: "",
    link_title: "",
    amount: "",
    notes: "",
    status: "confirmed",
  });

  if (!supabase) {
    return (
      <div className="container">
        <div className="card">تعذر تشغيل لوحة الأدمن حالياً.</div>
      </div>
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadClients();
      loadAdminSections();
      loadReferrals();
      loadAppUsers();
      loadLinkStats();
      loadRecentClicks();
      loadPurchases();
    }
  }, [session]);

  useEffect(() => {
    if (selectedSlug) {
      loadClientContent(selectedSlug);
      loadClientMeta(selectedSlug);
    }
  }, [selectedSlug]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserSections(selectedUserId);
    }
  }, [selectedUserId]);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setClients([]);
    setSelectedSlug("");
    setAppUsers([]);
    setSelectedUserId("");
  }

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      alert(error.message);
      return;
    }
    setClients(data || []);
    if (!selectedSlug && data && data.length) {
      setSelectedSlug(data[0].slug);
    }
  }

  async function loadClientMeta(slug) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) {
      return;
    }
    setClientMeta(data);
  }

  async function loadClientContent(slug) {
    const { data, error } = await supabase
      .from("client_sections")
      .select("*")
      .eq("client_slug", slug)
      .order("sort_order", { ascending: true });
    if (error) {
      alert(error.message);
      return;
    }
    const grouped = groupBySection(data || []);
    setSection1(grouped[1]?.[0] || emptyItem());
    setLinks(grouped[2] || [emptyItem()]);
    setOffers(grouped[3] || [emptyItem()]);
  }

  async function loadAdminSections() {
    const { data, error } = await supabase
      .from("admin_sections")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      alert(error.message);
      return;
    }
    const grouped = groupBySection(data || []);
    setAdminAds(grouped[4] || [emptyItem()]);
    setMarketingLinks(grouped[5] || [emptyItem()]);
  }

  async function loadReferrals() {
    const { data, error } = await supabase
      .from("referral_visits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      return;
    }
    setReferrals(data || []);
  }

  async function loadAppUsers() {
    const { data, error } = await supabase
      .from("app_users")
      .select("user_id,email,full_name,provider,last_login,created_at")
      .order("last_login", { ascending: false });
    if (error) {
      return;
    }
    setAppUsers(data || []);
    if (!selectedUserId && data && data.length) {
      setSelectedUserId(data[0].user_id);
    }
  }

  async function loadLinkStats() {
    const { data, error } = await supabase
      .from("link_stats")
      .select("*")
      .order("total_clicks", { ascending: false })
      .limit(50);
    if (!error) setLinkStats(data || []);
  }

  async function loadRecentClicks() {
    const { data, error } = await supabase
      .from("link_clicks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error) setRecentClicks(data || []);
  }

  async function loadPurchases() {
    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setPurchases(data || []);
  }

  async function addPurchase() {
    if (!newPurchase.user_email) {
      alert("يرجى إدخال إيميل المستخدم");
      return;
    }
    const { error } = await supabase.from("purchases").insert({
      user_email: newPurchase.user_email,
      link_url: newPurchase.link_url,
      link_title: newPurchase.link_title,
      amount: parseFloat(newPurchase.amount) || 0,
      notes: newPurchase.notes,
      status: newPurchase.status,
      client_slug: selectedSlug,
      recorded_by: session?.user?.id,
    });
    if (error) {
      alert("خطأ: " + error.message);
      return;
    }
    alert("تم تسجيل الشراء");
    setNewPurchase({ user_email: "", link_url: "", link_title: "", amount: "", notes: "", status: "confirmed" });
    loadPurchases();
  }

  async function loadUserSections(userId) {
    const { data, error } = await supabase
      .from("app_user_sections")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (error) {
      alert(error.message);
      return;
    }
    setUserItems((data || []).length ? data : [emptyItem()]);
  }

  async function saveClientMeta() {
    const payload = {
      name: clientMeta.name,
      slug: clientMeta.slug,
      logo_url: clientMeta.logo_url,
      referral_code: clientMeta.referral_code,
      commission_rate: Number(clientMeta.commission_rate || 10),
    };
    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("slug", selectedSlug);
    if (error) {
      alert(error.message);
      return;
    }
    alert("تم حفظ بيانات العميل");
    loadClients();
  }

  async function saveSection1() {
    await saveListSection(selectedSlug, 1, [section1]);
    alert("تم حفظ قسم الشركة");
  }

  async function saveLinks() {
    await saveListSection(selectedSlug, 2, links);
    alert("تم حفظ روابط الشركة");
  }

  async function saveOffers() {
    await saveListSection(selectedSlug, 3, offers);
    alert("تم حفظ عروض الشركة");
  }

  async function saveAdminAds() {
    await saveAdminList(4, adminAds);
    alert("تم حفظ الإعلانات");
  }

  async function saveMarketingLinks() {
    await saveAdminList(5, marketingLinks);
    alert("تم حفظ روابط التسويق");
  }

  async function saveUserItems() {
    if (!selectedUserId) return;
    const { error: delError } = await supabase.from("app_user_sections").delete().eq("user_id", selectedUserId);
    if (delError) {
      alert("خطأ بالحذف: " + delError.message);
      return;
    }
    const payload = userItems
      .filter((item) => item.title || item.body || item.image_url || item.link_url)
      .map((item, index) => ({
        user_id: selectedUserId,
        section: 1,
        title: item.title,
        body: item.body,
        image_url: item.image_url,
        link_url: item.link_url,
        sort_order: index,
      }));
    if (payload.length) {
      const { error } = await supabase.from("app_user_sections").insert(payload);
      if (error) {
        alert(error.message);
        return;
      }
    }
    alert("تم حفظ محتوى المستخدم");
  }

  async function saveListSection(slug, section, items) {
    const { error: delError } = await supabase
      .from("client_sections")
      .delete()
      .eq("client_slug", slug)
      .eq("section", section);
    if (delError) {
      alert("خطأ بالحذف: " + delError.message);
      return;
    }
    const payload = items
      .filter((item) => item.title || item.body || item.image_url || item.link_url)
      .map((item, index) => ({
        client_slug: slug,
        section,
        title: item.title,
        body: item.body,
        image_url: item.image_url,
        link_url: item.link_url,
        sort_order: index,
      }));
    if (payload.length) {
      const { error } = await supabase.from("client_sections").insert(payload);
      if (error) {
        alert(error.message);
      }
    }
  }

  async function saveAdminList(section, items) {
    const { error: delError } = await supabase.from("admin_sections").delete().eq("section", section);
    if (delError) {
      alert("خطأ بالحذف: " + delError.message);
      return;
    }
    const payload = items
      .filter((item) => item.title || item.body || item.image_url || item.link_url)
      .map((item, index) => ({
        section,
        title: item.title,
        body: item.body,
        image_url: item.image_url,
        link_url: item.link_url,
        sort_order: index,
        is_active: true,
      }));
    if (payload.length) {
      const { error } = await supabase.from("admin_sections").insert(payload);
      if (error) {
        alert(error.message);
      }
    }
  }

  function groupBySection(items) {
    return items.reduce((acc, item) => {
      const section = item.section;
      acc[section] = acc[section] || [];
      acc[section].push(item);
      return acc;
    }, {});
  }

  function updateList(setter, list, index, field, value) {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setter(updated);
  }

  function addItem(setter, list) {
    setter([...list, emptyItem()]);
  }

  function removeItem(setter, list, index) {
    const updated = list.filter((_, idx) => idx !== index);
    setter(updated.length ? updated : [emptyItem()]);
  }

  if (!session) {
    return (
      <div className="container">
        <div className="card">
          <div className="section-title">تسجيل دخول الأدمن</div>
          <label>البريد الإلكتروني</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label style={{ marginTop: 8 }}>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={signIn}>دخول</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="section-title">العملاء</div>
        <div className="row">
          <div style={{ flex: 2 }}>
            <label>اختيار العميل</label>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
            >
              {clients.map((client) => (
                <option key={client.slug} value={client.slug}>
                  {client.name} ({client.slug})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>نسبة العمولة (%)</label>
            <input
              type="number"
              value={clientMeta.commission_rate || 10}
              onChange={(e) =>
                setClientMeta({ ...clientMeta, commission_rate: e.target.value })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>كود الإحالة</label>
            <input
              value={clientMeta.referral_code || ""}
              onChange={(e) =>
                setClientMeta({ ...clientMeta, referral_code: e.target.value })
              }
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label>اسم العميل</label>
            <input
              value={clientMeta.name || ""}
              onChange={(e) =>
                setClientMeta({ ...clientMeta, name: e.target.value })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>اللوجو (رابط)</label>
            <input
              value={clientMeta.logo_url || ""}
              onChange={(e) =>
                setClientMeta({ ...clientMeta, logo_url: e.target.value })
              }
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={saveClientMeta}>حفظ بيانات العميل</button>
          <button className="secondary" onClick={signOut} style={{ marginRight: 8 }}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">1) بيانات الشركة</div>
        <TextBlock item={section1} onChange={setSection1} />
        <button onClick={saveSection1}>حفظ القسم</button>
      </div>

      <div className="card">
        <div className="section-title">2) روابط الشركة</div>
        <ListEditor
          items={links}
          onChange={setLinks}
          showBody={false}
          showImage={false}
        />
        <div className="row">
          <button onClick={() => addItem(setLinks, links)}>إضافة رابط</button>
          <button className="secondary" onClick={saveLinks}>
            حفظ الروابط
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">3) عروض الشركة</div>
        <ListEditor items={offers} onChange={setOffers} showImage />
        <div className="row">
          <button onClick={() => addItem(setOffers, offers)}>إضافة عرض</button>
          <button className="secondary" onClick={saveOffers}>
            حفظ العروض
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">4) إعلانات الأدمن</div>
        <ListEditor items={adminAds} onChange={setAdminAds} showImage />
        <div className="row">
          <button onClick={() => addItem(setAdminAds, adminAds)}>إضافة إعلان</button>
          <button className="secondary" onClick={saveAdminAds}>
            حفظ الإعلانات
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">5) روابط التسويق</div>
        <ListEditor
          items={marketingLinks}
          onChange={setMarketingLinks}
          showBody={false}
          showImage={false}
        />
        <div className="row">
          <button onClick={() => addItem(setMarketingLinks, marketingLinks)}>
            إضافة رابط
          </button>
          <button className="secondary" onClick={saveMarketingLinks}>
            حفظ روابط التسويق
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">سجل الإحالات (آخر 50)</div>
        {referrals.length === 0 && (
          <div className="muted">لا توجد إحالات بعد.</div>
        )}
        {referrals.map((item) => (
          <div key={item.id} className="list-item">
            <div>الكود: {item.referral_code}</div>
            <div className="muted">العميل: {item.referrer_client_slug || "-"}</div>
            <div className="muted">
              الوقت: {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">📊 إحصائيات النقرات</div>
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="secondary" onClick={() => { loadLinkStats(); loadRecentClicks(); }}>
            تحديث الإحصائيات
          </button>
        </div>
        {linkStats.length === 0 && (
          <div className="muted">لا توجد نقرات بعد.</div>
        )}
        {linkStats.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "right" }}>
                <th style={{ padding: 6 }}>الرابط</th>
                <th style={{ padding: 6 }}>القسم</th>
                <th style={{ padding: 6 }}>النقرات</th>
                <th style={{ padding: 6 }}>مستخدمين</th>
                <th style={{ padding: 6 }}>آخر نقرة</th>
              </tr>
            </thead>
            <tbody>
              {linkStats.map((stat, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 6, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {stat.link_title || stat.link_url}
                  </td>
                  <td style={{ padding: 6 }}>{stat.link_section || "-"}</td>
                  <td style={{ padding: 6, fontWeight: "bold" }}>{stat.total_clicks}</td>
                  <td style={{ padding: 6 }}>{stat.unique_users}</td>
                  <td style={{ padding: 6 }} className="muted">
                    {stat.last_click ? new Date(stat.last_click).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="section-title">🕐 آخر النقرات</div>
        {recentClicks.length === 0 && (
          <div className="muted">لا توجد نقرات بعد.</div>
        )}
        {recentClicks.map((click) => (
          <div key={click.id} className="list-item" style={{ padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{click.link_title || "بدون عنوان"}</strong>
              <span className="muted">{click.source}</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {click.user_email || "مجهول"} • {click.link_section || "-"} • {new Date(click.created_at).toLocaleString()}
            </div>
            <div className="muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {click.link_url}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">💰 تسجيل شراء جديد</div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>إيميل المشتري</label>
            <input
              value={newPurchase.user_email}
              onChange={(e) => setNewPurchase({ ...newPurchase, user_email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>المبلغ</label>
            <input
              type="number"
              value={newPurchase.amount}
              onChange={(e) => setNewPurchase({ ...newPurchase, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>الحالة</label>
            <select
              value={newPurchase.status}
              onChange={(e) => setNewPurchase({ ...newPurchase, status: e.target.value })}
            >
              <option value="confirmed">مؤكد</option>
              <option value="pending">قيد الانتظار</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label>عنوان الرابط</label>
            <input
              value={newPurchase.link_title}
              onChange={(e) => setNewPurchase({ ...newPurchase, link_title: e.target.value })}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label>ملاحظات</label>
            <input
              value={newPurchase.notes}
              onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="secondary" onClick={addPurchase}>تسجيل الشراء</button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">📋 سجل المشتريات</div>
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="secondary" onClick={loadPurchases}>تحديث</button>
        </div>
        {purchases.length === 0 && (
          <div className="muted">لا توجد مشتريات بعد.</div>
        )}
        {purchases.map((p) => (
          <div key={p.id} className="list-item" style={{ padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{p.user_email}</strong>
              <span style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                background: p.status === "confirmed" ? "#d4edda" : p.status === "pending" ? "#fff3cd" : "#f8d7da",
                color: p.status === "confirmed" ? "#155724" : p.status === "pending" ? "#856404" : "#721c24",
              }}>
                {p.status === "confirmed" ? "مؤكد" : p.status === "pending" ? "قيد الانتظار" : "ملغي"}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              المبلغ: <strong>{p.amount} {p.currency}</strong>
              {p.link_title ? ` • ${p.link_title}` : ""}
            </div>
            {p.notes && <div className="muted" style={{ fontSize: 12 }}>{p.notes}</div>}
            <div className="muted" style={{ fontSize: 12 }}>
              {new Date(p.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">مستخدمو التطبيق</div>
        {appUsers.length === 0 && (
          <div className="muted">لا يوجد مستخدمون حتى الآن.</div>
        )}
        {appUsers.length > 0 && (
          <>
            <label>اختيار المستخدم</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {appUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.email || user.full_name || user.user_id}
                </option>
              ))}
            </select>
            <div className="muted" style={{ marginTop: 6 }}>
              المزوّد:{" "}
              {appUsers.find((u) => u.user_id === selectedUserId)?.provider ||
                "-"}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              آخر دخول:{" "}
              {appUsers.find((u) => u.user_id === selectedUserId)?.last_login
                ? new Date(
                    appUsers.find((u) => u.user_id === selectedUserId).last_login
                  ).toLocaleString()
                : "-"}
            </div>
            <div className="section-title" style={{ marginTop: 12 }}>
              روابط وصور خاصة بالمستخدم
            </div>
            <ListEditor items={userItems} onChange={setUserItems} showImage />
            <div className="row">
              <button onClick={() => addItem(setUserItems, userItems)}>
                إضافة عنصر
              </button>
              <button className="secondary" onClick={saveUserItems}>
                حفظ محتوى المستخدم
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TextBlock({ item, onChange }) {
  return (
    <div className="row">
      <div style={{ flex: 1 }}>
        <label>العنوان</label>
        <input
          value={item.title || ""}
          onChange={(e) => onChange({ ...item, title: e.target.value })}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label>صورة (رابط)</label>
        <input
          value={item.image_url || ""}
          onChange={(e) => onChange({ ...item, image_url: e.target.value })}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label>رابط</label>
        <input
          value={item.link_url || ""}
          onChange={(e) => onChange({ ...item, link_url: e.target.value })}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label>النص</label>
        <textarea
          value={item.body || ""}
          onChange={(e) => onChange({ ...item, body: e.target.value })}
        />
      </div>
    </div>
  );
}

function ListEditor({ items, onChange, showBody = true, showImage = true }) {
  return (
    <div>
      {items.map((item, index) => (
        <div className="list-item" key={item._key || index}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>العنوان</label>
              <input
                value={item.title || ""}
                onChange={(e) =>
                  updateList(onChange, items, index, "title", e.target.value)
                }
              />
            </div>
            {showImage && (
              <div style={{ flex: 1 }}>
                <label>صورة (رابط)</label>
                <input
                  value={item.image_url || ""}
                  onChange={(e) =>
                    updateList(onChange, items, index, "image_url", e.target.value)
                  }
                />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label>رابط</label>
              <input
                value={item.link_url || ""}
                onChange={(e) =>
                  updateList(onChange, items, index, "link_url", e.target.value)
                }
              />
            </div>
          </div>
          {showBody && (
            <div style={{ marginTop: 8 }}>
              <label>الوصف</label>
              <textarea
                value={item.body || ""}
                onChange={(e) =>
                  updateList(onChange, items, index, "body", e.target.value)
                }
              />
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button className="danger" onClick={() => removeItem(onChange, items, index)}>
              حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
