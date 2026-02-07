const config = window.PUBLIC_CONFIG;
const supabase = window.supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const statusEl = document.getElementById("status");

function getVisitorId() {
  const key = "visitor_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  const referralCode = params.get("ref");
  if (!referralCode) {
    statusEl.textContent = "لا يوجد كود إحالة.";
    return;
  }

  const visitorId = getVisitorId();
  const landingUrl = window.location.href;

  const { data: client } = await supabase
    .from("clients")
    .select("slug")
    .eq("referral_code", referralCode)
    .single();

  const { error } = await supabase.from("referral_visits").insert({
    referral_code: referralCode,
    referrer_client_slug: client?.slug ?? null,
    visitor_id: visitorId,
    landing_url: landingUrl,
  });

  statusEl.textContent = error
    ? "تعذر تسجيل الإحالة."
    : "تم تسجيل الإحالة بنجاح.";
}

main();
