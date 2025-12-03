/**
 * Form Validation Example
 *
 * Demonstrates HSX features:
 * - Inline validation with `post` on input blur
 * - `trigger="blur changed"` for validation on field exit
 * - `target` for updating specific error containers
 * - `swap="innerHTML"` for error messages
 * - Form submission with full validation
 * - `vals` for passing additional context
 */
import { render, renderHtml } from "../../src/index.ts";
import { Card, Subtitle } from "./components.tsx";
import { routes } from "./routes.ts";
import { ids } from "./ids.ts";

const styles = `
:root { --accent: #0ea5e9; --bg: #f0f9ff; --surface: #fff; --border: #bae6fd; --text: #0c4a6e; --muted: #64748b; --error: #dc2626; --success: #16a34a; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: var(--bg); padding: 2rem; line-height: 1.6; color: var(--text); }
main { max-width: 24rem; margin: 0 auto; }
h1 { font-weight: 300; margin-bottom: 0.5rem; }
.subtitle { color: var(--muted); margin-bottom: 2rem; }

.card { background: var(--surface); border-radius: 12px; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; }
.form-group input { width: 100%; padding: 0.75rem 1rem; font: inherit; border: 2px solid var(--border); border-radius: 8px; transition: border-color 0.2s; }
.form-group input:focus { outline: none; border-color: var(--accent); }
.form-group input.is-valid { border-color: var(--success); }
.form-group input.is-invalid { border-color: var(--error); }

.field-feedback { min-height: 1.5rem; font-size: 0.875rem; margin-top: 0.25rem; }
.error-msg { color: var(--error); display: flex; align-items: center; gap: 0.25rem; }
.success-msg { color: var(--success); display: flex; align-items: center; gap: 0.25rem; }
.loading { color: var(--muted); }

.btn { width: 100%; padding: 0.75rem; font: inherit; font-weight: 500; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
.btn:hover { background: #0284c7; }
.btn:disabled { background: var(--border); cursor: not-allowed; }

.htmx-request .btn { opacity: 0.7; pointer-events: none; }
.result { margin-top: 1rem; padding: 1rem; border-radius: 8px; text-align: center; }
.result.success { background: #dcfce7; color: var(--success); }
.result.error { background: #fee2e2; color: var(--error); }

.password-strength { display: flex; gap: 0.25rem; margin-top: 0.5rem; }
.strength-bar { height: 4px; flex: 1; border-radius: 2px; background: var(--border); }
.strength-bar.weak { background: var(--error); }
.strength-bar.medium { background: #f59e0b; }
.strength-bar.strong { background: var(--success); }
`;

// Simulated taken usernames and emails
const takenUsernames = ["admin", "user", "john", "jane"];
const takenEmails = ["admin@example.com", "user@example.com"];

function ErrorMessage(props: { message: string }) {
  return <span class="error-msg">⚠ {props.message}</span>;
}

function SuccessMessage(props: { message: string }) {
  return <span class="success-msg">✓ {props.message}</span>;
}

function PasswordStrength(props: { level: number }) {
  const levels = ["", "weak", "medium", "strong"];
  return (
    <div class="password-strength">
      {[1, 2, 3].map((i) => (
        <div
          class={`strength-bar ${i <= props.level ? levels[props.level] : ""}`}
        />
      ))}
    </div>
  );
}

function FormResult(props: { success: boolean; message: string }) {
  return (
    <div class={`result ${props.success ? "success" : "error"}`}>
      {props.message}
    </div>
  );
}

function Page() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Form Validation - HSX Example</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <h1>Create Account</h1>
          <Subtitle>Real-time validation as you type</Subtitle>
          <Card>
            <form
              post={routes.register}
              target={ids.formResult}
              swap="innerHTML"
            >
              <div class="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Choose a username"
                  required
                  minLength={3}
                  post={routes.validate.username}
                  trigger="blur changed delay:300ms"
                  target={ids.usernameError}
                  swap="innerHTML"
                />
                <div class="field-feedback" id="username-error"></div>
              </div>
              <div class="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  post={routes.validate.email}
                  trigger="blur changed delay:300ms"
                  target={ids.emailError}
                  swap="innerHTML"
                />
                <div class="field-feedback" id="email-error"></div>
              </div>
              <div class="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  post={routes.validate.password}
                  trigger="keyup changed delay:200ms"
                  target={ids.passwordError}
                  swap="innerHTML"
                />
                <div class="field-feedback" id="password-error"></div>
              </div>
              <button type="submit" class="btn">Create Account</button>
              <div id="form-result"></div>
            </form>
          </Card>
        </main>
      </body>
    </html>
  );
}

// Validation helpers
function validateUsername(
  username: string,
): { valid: boolean; message: string; strength?: number } {
  if (!username) return { valid: false, message: "Username is required" };
  if (username.length < 3) {
    return { valid: false, message: "Username must be at least 3 characters" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: "Only letters, numbers, and underscores" };
  }
  if (takenUsernames.includes(username.toLowerCase())) {
    return { valid: false, message: "Username is already taken" };
  }
  return { valid: true, message: "Username is available" };
}

function validateEmail(email: string): { valid: boolean; message: string } {
  if (!email) return { valid: false, message: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: "Please enter a valid email" };
  }
  if (takenEmails.includes(email.toLowerCase())) {
    return { valid: false, message: "Email is already registered" };
  }
  return { valid: true, message: "Email looks good" };
}

function validatePassword(
  password: string,
): { valid: boolean; message: string; strength: number } {
  if (!password) {
    return { valid: false, message: "Password is required", strength: 0 };
  }
  if (password.length < 8) {
    return {
      valid: false,
      message: "At least 8 characters required",
      strength: 1,
    };
  }
  let strength = 1;
  if (password.length >= 12) strength++;
  if (
    /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
  ) strength++;
  const msg = strength === 1
    ? "Weak password"
    : strength === 2
    ? "Good password"
    : "Strong password";
  return { valid: true, message: msg, strength };
}

// =============================================================================
// Server
// =============================================================================

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return render(<Page />);

  if (req.method === "POST") {
    const form = await req.formData();

    if (pathname === "/validate/username") {
      await new Promise((r) => setTimeout(r, 100)); // Simulate API check
      const result = validateUsername(String(form.get("username") ?? ""));
      const html = result.valid
        ? renderHtml(<SuccessMessage message={result.message} />)
        : renderHtml(<ErrorMessage message={result.message} />);
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (pathname === "/validate/email") {
      await new Promise((r) => setTimeout(r, 100));
      const result = validateEmail(String(form.get("email") ?? ""));
      const html = result.valid
        ? renderHtml(<SuccessMessage message={result.message} />)
        : renderHtml(<ErrorMessage message={result.message} />);
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (pathname === "/validate/password") {
      const result = validatePassword(String(form.get("password") ?? ""));
      const html = renderHtml(
        <>
          {result.valid
            ? <SuccessMessage message={result.message} />
            : <ErrorMessage message={result.message} />}
          <PasswordStrength level={result.strength} />
        </>,
      );
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (pathname === "/register") {
      await new Promise((r) => setTimeout(r, 500)); // Simulate registration
      const u = validateUsername(String(form.get("username") ?? ""));
      const e = validateEmail(String(form.get("email") ?? ""));
      const p = validatePassword(String(form.get("password") ?? ""));
      if (u.valid && e.valid && p.valid) {
        return new Response(
          renderHtml(
            <FormResult
              success={true}
              message="Account created successfully!"
            />,
          ),
          { headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }
      return new Response(
        renderHtml(
          <FormResult success={false} message="Please fix the errors above" />,
        ),
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
  }

  if (pathname === "/static/htmx.js") {
    try {
      const js = await Deno.readTextFile(
        new URL("../../vendor/htmx/htmx.js", import.meta.url),
      );
      return new Response(js, {
        headers: { "content-type": "text/javascript; charset=utf-8" },
      });
    } catch {
      return new Response("// htmx.js not found", {
        status: 500,
        headers: { "content-type": "text/javascript" },
      });
    }
  }

  return new Response("Not found", { status: 404 });
});
