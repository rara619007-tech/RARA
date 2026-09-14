module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = String(req.query.id || "").trim();
  if (!/^\d{5,25}$/.test(id)) {
    res.status(400).json({ error: "Paste a tweet ID (the numbers at the end of the X link)" });
    return;
  }
  try {
    const r = await fetch("https://api.fxtwitter.com/status/" + id, {
      headers: { "User-Agent": "x-watch-web/1.0", Accept: "application/json" },
    });
    if (r.status === 404) {
      res.status(200).json({ ok: true, live: false, tweet_id: id, status: "deleted_or_missing" });
      return;
    }
    if (!r.ok) {
      res.status(200).json({ ok: false, live: null, tweet_id: id, status: "unknown" });
      return;
    }
    const data = await r.json();
    const tw = data.tweet || data.status || null;
    if (!tw) {
      res.status(200).json({ ok: true, live: false, tweet_id: id, status: "deleted_or_missing" });
      return;
    }
    const author = tw.author || {};
    res.status(200).json({
      ok: true,
      live: true,
      status: "live",
      tweet_id: String(tw.id || id),
      text: tw.text || tw.full_text || "",
      created_at: tw.created_at || tw.date || "",
      handle: author.screen_name || "",
      user_id: author.id ? String(author.id) : "",
      url: "https://x.com/i/status/" + id,
    });
  } catch (err) {
    res.status(500).json({ error: "Lookup failed. Try again in a minute." });
  }
};
