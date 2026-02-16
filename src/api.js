async function parse(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

export async function api(path, { method = "GET", body } = {}) {
  const isFormData = body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: isFormData ? undefined : (body ? { "Content-Type": "application/json" } : undefined),
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const data = await parse(res);

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || "API_ERROR");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
