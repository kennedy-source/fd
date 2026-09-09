const baseUrl = process.env.PAJOY_API_URL ?? "http://127.0.0.1:3001";
const username = process.env.PAJOY_ADMIN_USERNAME ?? "admin";
const password = process.env.PAJOY_ADMIN_PASSWORD ?? process.env.PAJOY_BOOTSTRAP_PASSWORD;

if (process.env.RESET_CONFIRMATION !== "RESET_PAJOY_BUSINESS") {
  throw new Error("Refusing to reset. Set RESET_CONFIRMATION=RESET_PAJOY_BUSINESS explicitly.");
}
if (!password) {
  throw new Error("Set PAJOY_ADMIN_PASSWORD or PAJOY_BOOTSTRAP_PASSWORD before resetting.");
}

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password }),
});
if (!login.ok) throw new Error(`Admin login failed with HTTP ${login.status}.`);
const session = await login.json();

const reset = await fetch(`${baseUrl}/api/admin/reset-business`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${session.token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ confirmation: "RESET_PAJOY_BUSINESS" }),
});
if (!reset.ok) throw new Error(`Business reset failed with HTTP ${reset.status}: ${await reset.text()}`);
console.info((await reset.json()).message);
