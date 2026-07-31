const SHORTENER_ENDPOINT = "https://is.gd/create.php";

export async function shortenUrl(longUrl: string): Promise<string> {
  const endpoint = `${SHORTENER_ENDPOINT}?format=json&url=${encodeURIComponent(longUrl)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Shortener responded ${response.status}`);
  }

  const data = (await response.json()) as { shorturl?: string; errormessage?: string };
  if (!data.shorturl) {
    throw new Error(data.errormessage ?? "Shortener returned no URL");
  }

  return data.shorturl;
}
