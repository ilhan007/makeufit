"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'72', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 460, padding: "0 1.5rem" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="36" height="36">
              <path fill="#ffffff" d="M8.715 4.006c.241-.03.5.01.647.238.336.523.641 1.041 1.08 1.491.653.67 1.582 1.284 2.809 1.284a.75.75 0 0 1 0 1.5c-1.915 0-3.26-1.04-4.07-1.94l-.362 1.668 1.944 2.032c.133.14.208.326.208.519v4.452a.75.75 0 0 1-1.5 0v-4.151L8.264 9.836 7.192 12.5a.75.75 0 0 1-.89.444l-3.747-1.01a.75.75 0 1 1 .39-1.448l3.103.836 1.227-3.045.576-2.653-2.331.291v1.863a.751.751 0 0 1-1.5 0V5.255a.75.75 0 0 1 .656-.744l4.04-.505ZM9.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
            </svg>
          </div>
          <h1 style={{
            color: "#f8fafc",
            fontSize: "2rem",
            fontWeight: 700,
            margin: "0 0 0.5rem",
            letterSpacing: "-0.5px",
          }}>
            MakeUFit
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem", margin: 0 }}>
            Your personal fitness tracker
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "2rem",
          backdropFilter: "blur(12px)",
        }}>

          {/* Features */}
          <div style={{ marginBottom: "2rem" }}>
            {[
              { icon: "🏋️", title: "Log Workouts", desc: "Track exercises, sets, reps and weights" },
              { icon: "📋", title: "Training Plans", desc: "Follow structured plans from your coach or create your own" },
              { icon: "🤝", title: "Find a Coach", desc: "Connect with a coach to get personalized guidance" },
              { icon: "📊", title: "Body Metrics", desc: "Monitor weight, body fat and measurements" },
              { icon: "📈", title: "Progress Charts", desc: "Visualize your gains over time" },
            ].map((f, i, arr) => (
              <div key={f.title} style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "0.75rem 0",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.9rem" }}>{f.title}</div>
                  <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Google Button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "0.875rem 1.5rem",
              background: "#ffffff",
              color: "#1e293b",
              border: "none",
              borderRadius: 12,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", color: "#475569", fontSize: "0.75rem", marginTop: "1rem", marginBottom: 0 }}>
            Sign in to access your personal fitness dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
