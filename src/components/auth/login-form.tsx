"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type DemoCredentials = {
  doctor: {
    name: string;
    email: string;
    password: string;
  };
  receptionist: {
    name: string;
    email: string;
    password: string;
  };
};

export function LoginForm({ demoCredentials }: { demoCredentials: DemoCredentials }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginWithCredentials = async (payload: { email: string; password: string }) => {
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials");
      return;
    }

    window.location.href = "/dashboard";
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginWithCredentials({ email, password });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border-2 border-black bg-white px-3 py-2 outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[4px_4px_0_0_#000]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold">Password</span>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border-2 border-black bg-white px-3 py-2 outline-none focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[4px_4px_0_0_#000]"
        />
      </label>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full border-2 border-black bg-[#121212] px-4 py-2 font-semibold text-white shadow-[4px_4px_0_0_#000] transition disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="space-y-2 border-2 border-black bg-[#fff1dc] p-3">
        <p className="text-xs font-bold">Quick Demo Login</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => loginWithCredentials(demoCredentials.doctor)}
          className="w-full border-2 border-black bg-white px-3 py-2 text-left text-sm font-semibold shadow-[3px_3px_0_0_#000] disabled:opacity-60"
        >
          Login as Doctor
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => loginWithCredentials(demoCredentials.receptionist)}
          className="w-full border-2 border-black bg-white px-3 py-2 text-left text-sm font-semibold shadow-[3px_3px_0_0_#000] disabled:opacity-60"
        >
          Login as Receptionist
        </button>
      </div>
    </form>
  );
}
