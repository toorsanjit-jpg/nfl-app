"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/types/admin";

type Props = {
  initial: AdminUser[];
};

export function AdminUsersManager({ initial }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updateFlag = async (user: AdminUser, key: "is_admin" | "is_premium", value: boolean) => {
    setLoadingId(user.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_admin: key === "is_admin" ? value : user.is_admin, is_premium: key === "is_premium" ? value : user.is_premium }),
      });
      const json = await res.json();
      if (!res.ok || !json.saved) {
        setMessage(json?._meta?.error || "Failed to update user");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? (json.saved as AdminUser) : u)));
    } catch (err: any) {
      setMessage(err?.message || "Failed to update user");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {message ? <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{message}</div> : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Premium</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2">{user.email ?? "(no email)"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {user.created_at ? new Date(user.created_at).toLocaleString() : "-"}
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={user.is_admin}
                      disabled={loadingId === user.id}
                      onChange={(e) => updateFlag(user, "is_admin", e.target.checked)}
                    />
                    Admin
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={user.is_premium}
                      disabled={loadingId === user.id}
                      onChange={(e) => updateFlag(user, "is_premium", e.target.checked)}
                    />
                    Premium
                  </label>
                </td>
                <td className="px-3 py-2 text-right">
                  {loadingId === user.id ? (
                    <span className="text-xs text-muted-foreground">Saving…</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
