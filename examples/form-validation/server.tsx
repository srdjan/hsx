import { hsxComponent, hsxPage } from "../../src/index.ts";
import { hsxStyles, HSX_STYLES_PATH } from "../../src/styles.ts";
import { Card, Subtitle } from "./components.tsx";
import { ids } from "./ids.ts";

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

// HSX Components

const ValidateUsername = hsxComponent("/validate/username", {
  methods: ["POST"],
  async handler(req) {
    await new Promise((r) => setTimeout(r, 100));
    const form = await req.formData();
    const result = validateUsername(String(form.get("username") ?? ""));
    return result;
  },
  render: (result) => result.valid
    ? <SuccessMessage message={result.message} />
    : <ErrorMessage message={result.message} />,
});

const ValidateEmail = hsxComponent("/validate/email", {
  methods: ["POST"],
  async handler(req) {
    await new Promise((r) => setTimeout(r, 100));
    const form = await req.formData();
    const result = validateEmail(String(form.get("email") ?? ""));
    return result;
  },
  render: (result) => result.valid
    ? <SuccessMessage message={result.message} />
    : <ErrorMessage message={result.message} />,
});

const ValidatePassword = hsxComponent("/validate/password", {
  methods: ["POST"],
  handler(req) {
    const form = req.formData();
    return Promise.resolve(form).then((f) => {
      const result = validatePassword(String(f.get("password") ?? ""));
      return result;
    });
  },
  render: (result) => (
    <>
      {result.valid
        ? <SuccessMessage message={result.message} />
        : <ErrorMessage message={result.message} />}
      <PasswordStrength level={result.strength} />
    </>
  ),
});

const Register = hsxComponent("/register", {
  methods: ["POST"],
  async handler(req) {
    await new Promise((r) => setTimeout(r, 500));
    const form = await req.formData();
    const u = validateUsername(String(form.get("username") ?? ""));
    const e = validateEmail(String(form.get("email") ?? ""));
    const p = validatePassword(String(form.get("password") ?? ""));
    const success = u.valid && e.valid && p.valid;
    return { success, message: success ? "Account created successfully!" : "Please fix the errors above" };
  },
  render: ({ success, message }) => <FormResult success={success} message={message} />,
});

// Page

const Page = hsxPage(() => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Form Validation - HSX Example</title>
      <link rel="stylesheet" href={HSX_STYLES_PATH} />
      <style>{`:root { --hsx-accent: #0ea5e9; --hsx-bg: #f0f9ff; --hsx-border: #bae6fd; --hsx-text: #0c4a6e; }`}</style>
    </head>
    <body>
      <main>
        <header>
          <h1>Create Account</h1>
        </header>
        <Subtitle>Real-time validation as you type</Subtitle>
        <Card>
          <form
            post={Register}
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
                post={ValidateUsername}
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
                post={ValidateEmail}
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
                post={ValidatePassword}
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
));

// Server

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (pathname === "/") return Page.render();

  const components = [ValidateUsername, ValidateEmail, ValidatePassword, Register];
  for (const component of components) {
    const method = req.method as typeof component.methods[number];
    if (component.match(pathname) && component.methods.includes(method)) {
      return component.handle(req);
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

  if (pathname === HSX_STYLES_PATH) {
    return new Response(hsxStyles, {
      headers: { "content-type": "text/css; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
});
