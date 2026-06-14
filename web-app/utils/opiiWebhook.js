const OPII_WEBHOOK_URL = process.env.OPII_WEBHOOK_URL;
const OPII_WEBHOOK_SECRET = process.env.OPII_WEBHOOK_SECRET;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function notifyDiscord(post) {
  if (!OPII_WEBHOOK_URL || !DISCORD_GUILD_ID) return { success: false };

  const payload = {
    postId: post.id,
    title: post.title,
    description: post.description?.substring(0, 300) || "",
    authorName: post.authorName,
    imageUrl: post.imageUrl || null,
    postUrl: post.url,
    guildId: DISCORD_GUILD_ID,
    pingEveryone: post.pingEveryone || false,
  };

  try {
    const res = await fetch(`${OPII_WEBHOOK_URL}/new-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error("[Opii] Greška:", err);
    return { success: false };
  }
}