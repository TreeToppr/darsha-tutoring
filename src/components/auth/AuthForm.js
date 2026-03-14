"use client";

import { useState } from "react";
import { signInWithPassword, signUpWithPassword } from "../../app/auth/_actions";

export default function AuthForm({ portal }) {
  const [mode, setMode] = useState("signin");
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    const formData = new FormData(e.currentTarget);
    formData.set("portal", portal);

    const action = mode === "signup" ? signUpWithPassword : signInWithPassword;
    const res = await action(formData);
    if (res?.ok === false) setMessage(res.message || "Something went wrong");
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <button
          className={`px-3 py-2 rounded-lg text-sm ${mode === "signin" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`px-3 py-2 rounded-lg text-sm ${mode === "signup" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700">Email</span>
          <input name="email" type="email" required className="border rounded-xl px-3 py-2" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700">Password</span>
          <input name="password" type="password" required className="border rounded-xl px-3 py-2" />
        </label>

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <button className="mt-1 rounded-xl bg-emerald-600 text-white py-2 font-medium hover:bg-emerald-700" type="submit">
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
