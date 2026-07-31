async function viaDaGd(longUrl: string): Promise<string> {
  const response = await fetch(`https://da.gd/shorten?url=${encodeURIComponent(longUrl)}`);
  if (!response.ok) {
    throw new Error(`da.gd responded ${response.status}`);
  }
  const text = (await response.text()).trim();
  if (!text.startsWith("http")) {
    throw new Error(text || "da.gd returned no URL");
  }
  return text;
}

async function viaIsGd(longUrl: string): Promise<string> {
  const response = await fetch(
    `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`
  );
  if (!response.ok) {
    throw new Error(`is.gd responded ${response.status}`);
  }
  const data = (await response.json()) as { shorturl?: string; errormessage?: string };
  if (!data.shorturl) {
    throw new Error(data.errormessage ?? "is.gd returned no URL");
  }
  return data.shorturl;
}

const PROVIDERS = [viaDaGd, viaIsGd];

export async function shortenUrl(longUrl: string): Promise<string> {
  for (const provider of PROVIDERS) {
    try {
      return await provider(longUrl);
    } catch {
      // Try the next provider.
    }
  }
  throw new Error("All shortener providers failed");
}
