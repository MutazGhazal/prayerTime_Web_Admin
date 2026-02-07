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

const emptyItem = () => ({
  title: "",
  body: "",
  image_url: "",
  link_url: "",
});

function App() {
  if (!supabase) {
    return (
      <div className="container">
        <div className="card">تعذر تشغيل لوحة الأدمن حالياً.</div>
      </div>
    );
  }
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
  }, []);

  useEffect(() => {
    if (session) {
      loadClients();
      loadAdminSections();
      loadReferrals();
    }
  }, [session]);

  useEffect(() => {
    if (selectedSlug) {
      loadClientContent(selectedSlug);
      loadClientMeta(selectedSlug);
    }
  }, [selectedSlug]);

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

  async function saveListSection(slug, section, items) {
    await supabase
      .from("client_sections")
      .delete()
      .eq("client_slug", slug)
      .eq("section", section);
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
    await supabase.from("admin_sections").delete().eq("section", section);
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
        <div className="list-item" key={index}>
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

function updateList(setter, list, index, field, value) {
  const updated = [...list];
  updated[index] = { ...updated[index], [field]: value };
  setter(updated);
}

function removeItem(setter, list, index) {
  const updated = list.filter((_, idx) => idx !== index);
  setter(updated.length ? updated : [emptyItem()]);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
