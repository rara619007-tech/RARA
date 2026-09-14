module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const q = String(req.query.q || "").trim().replace(/^@/, "");
  if (!q) {
    res.status(400).json({ error: "Type an X username or user ID" });
    return;
  }

  const headers = { "User-Agent": "x-watch-web/1.0", Accept: "application/json" };

  let profile = null;
  try {
    const r = await fetch("https://api.fxtwitter.com/" + encodeURIComponent(q), { headers });
    if (r.ok) {
      const data = await r.json();
      if (data && data.user) {
        const u = data.user;
        profile = {
          user_id: String(u.id || ""),
          handle: u.screen_name || q,
          name: u.name || "",
          bio: u.description || "",
          tweets: u.tweets || 0,
          followers: u.followers || 0,
          following: u.following || 0,
          joined: u.joined || "",
          avatar: u.avatar_url || "",
          banner: u.banner_url || "",
          verified: !!(u.verification && u.verification.verified),
          protected: !!u.protected,
        };
      }
    }
  } catch (err) {
    profile = profile;
  }

  const history = [];
  const seen = new Set();
  async function addMemory(url) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) return;
      const data = await r.json();
      const accounts = Array.isArray(data.accounts) ? data.accounts : data.id ? [data] : [];
      for (const acc of accounts) {
        const names = acc["screen-names"] || acc.screen_names || {};
        for (const [handle, dates] of Object.entries(names)) {
          const key = handle.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          history.push({
            handle,
            dates: Array.isArray(dates) ? dates : [],
            user_id: String(acc.id || acc.id_str || (profile && profile.user_id) || ""),
          });
        }
      }
    } catch (_) {}
  }

  await addMemory("https://api.memory.lol/v1/tw/" + encodeURIComponent(q));
  if (profile && profile.user_id) {
    await addMemory("https://api.memory.lol/v1/tw/id/" + encodeURIComponent(profile.user_id));
  }

  if (!profile && history.length === 0) {
    res.status(404).json({ error: "Account not found. It may be renamed, suspended, or deleted." });
    return;
  }

  res.status(200).json({
    ok: true,
    profile,
    history,
    stable_url: profile ? "https://x.com/intent/user?user_id=" + profile.user_id : null,
    checked_at: new Date().toISOString(),
  });
};
