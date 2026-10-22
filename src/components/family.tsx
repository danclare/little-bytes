"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, type AssignableRole } from "../lib/roles";
import { api, capitalise, errorText, type FamilyRole } from "./shared";

type Member = {
  id: string;
  role: FamilyRole;
  joinedAt: string;
  name: string;
  email: string;
  isYou: boolean;
  canManage: boolean;
};
type Invitation = { id: string; email: string; role: FamilyRole; expiresAt: string };
type MembersResponse = { role: FamilyRole; members: Member[]; invitations: Invitation[] };

export const INVITE_STORAGE_KEY = "little-bites-invite";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FamilyMembers({
  role,
  setFailure,
  setSuccess,
  onLeft,
}: {
  role: FamilyRole;
  setFailure: (error: unknown) => void;
  setSuccess: (message: string) => void;
  onLeft: () => Promise<void>;
}) {
  const [data, setData] = useState<MembersResponse | null>(null);
  const [inviteRole, setInviteRole] = useState<AssignableRole>("editor");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<{
    email: string;
    url: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const canManage = role === "owner" || role === "admin";
  const assignable = ASSIGNABLE_ROLES.filter((option) => role === "owner" || option !== "admin");

  const load = useCallback(async () => {
    setData(await api<MembersResponse>("/api/family/members"));
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load().catch(setFailure));
  }, [load, setFailure]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setCopied(false);
    try {
      const result = await api<{
        invitation: Invitation;
        inviteUrl: string;
        emailSent: boolean;
      }>("/api/family/invitations", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setLastInvite({
        email: result.invitation.email,
        url: result.inviteUrl,
        emailSent: result.emailSent,
      });
      setInviteEmail("");
      await load();
      setSuccess(
        result.emailSent
          ? `Invitation emailed to ${result.invitation.email}.`
          : `Invitation created for ${result.invitation.email}. Share the link below with them.`,
      );
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: Member, next: AssignableRole) {
    try {
      await api(`/api/family/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
      await load();
      setSuccess(`${member.name} is now ${next === "admin" ? "an" : "a"} ${next}.`);
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function remove(member: Member) {
    const leaving = member.isYou;
    const prompt = leaving
      ? "Leave this family? You will lose access to its children, diary, plans and lists."
      : `Remove ${member.name} from this family? They will lose access immediately.`;
    if (!window.confirm(prompt)) return;
    try {
      await api(`/api/family/members/${member.id}`, { method: "DELETE" });
      if (leaving) {
        await onLeft();
        setSuccess("You have left the family.");
        return;
      }
      await load();
      setSuccess(`${member.name} has been removed from the family.`);
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function revoke(invitation: Invitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    try {
      await api(`/api/family/invitations/${invitation.id}`, { method: "DELETE" });
      if (lastInvite?.email === invitation.email) setLastInvite(null);
      await load();
      setSuccess("Invitation revoked.");
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function copyLink() {
    if (!lastInvite) return;
    try {
      await navigator.clipboard.writeText(lastInvite.url);
      setCopied(true);
    } catch {
      setCopied(false);
      setFailure(new Error("Copy failed. Select the link and copy it manually."));
    }
  }

  return (
    <section className="card" aria-labelledby="family-members-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">People</p>
          <h2 id="family-members-title">Family members</h2>
        </div>
        <span className="pill">
          You are {role === "admin" || role === "owner" ? "the" : "a"} {role}
        </span>
      </div>
      {!data ? (
        <p className="muted">Loading members…</p>
      ) : (
        <ul className="list member-list">
          {data.members.map((member) => (
            <li className="list-item member" key={member.id}>
              <span className="avatar" aria-hidden="true">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="list-item-main">
                <strong>
                  {member.name}
                  {member.isYou && <span className="muted"> (you)</span>}
                </strong>
                <small className="muted truncate">{member.email}</small>
                <small className="muted">Joined {formatDate(member.joinedAt)}</small>
              </div>
              <div className="list-item-actions">
                {member.canManage ? (
                  <>
                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      Role for {member.name}
                    </label>
                    <select
                      id={`role-${member.id}`}
                      value={member.role}
                      onChange={(event) =>
                        void changeRole(member, event.target.value as AssignableRole)
                      }
                    >
                      {assignable.map((option) => (
                        <option key={option} value={option}>
                          {capitalise(option)}
                        </option>
                      ))}
                      {!assignable.includes(member.role as AssignableRole) && (
                        <option value={member.role} disabled>
                          {capitalise(member.role)}
                        </option>
                      )}
                    </select>
                    <button
                      type="button"
                      className="button button-danger button-small"
                      onClick={() => void remove(member)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className={`tag role-${member.role}`}>{capitalise(member.role)}</span>
                )}
                {member.isYou && member.role !== "owner" && (
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => void remove(member)}
                  >
                    Leave family
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="role-guide">
        <summary>What can each role do?</summary>
        <dl>
          {(Object.keys(ROLE_DESCRIPTIONS) as FamilyRole[]).map((key) => (
            <div key={key}>
              <dt>{capitalise(key)}</dt>
              <dd>{ROLE_DESCRIPTIONS[key]}</dd>
            </div>
          ))}
        </dl>
      </details>

      {canManage && (
        <>
          <h3>Invite someone</h3>
          <p className="muted">
            Invitations are single-use, expire after 7 days and can only be accepted by the email
            address you enter.
          </p>
          <form className="form invite-form" onSubmit={invite}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="invite-email">Email address</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="off"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="invite-role">Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as AssignableRole)}
                  aria-describedby="invite-role-hint"
                >
                  {assignable.map((option) => (
                    <option key={option} value={option}>
                      {capitalise(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <small id="invite-role-hint" className="field-hint">
              {ROLE_DESCRIPTIONS[inviteRole]}
            </small>
            <div className="actions">
              <button className="button" disabled={busy}>
                {busy ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </form>
          {lastInvite && (
            <div className="notice invite-link">
              <strong>
                {lastInvite.emailSent
                  ? `We emailed ${lastInvite.email}. You can also share this link:`
                  : `Email delivery is not configured. Share this private link with ${lastInvite.email}:`}
              </strong>
              <div className="copy-row">
                <label className="sr-only" htmlFor="invite-link">
                  Invitation link
                </label>
                <input
                  id="invite-link"
                  readOnly
                  value={lastInvite.url}
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => void copyLink()}
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          )}
          {!!data?.invitations.length && (
            <>
              <h3>Pending invitations</h3>
              <ul className="list">
                {data.invitations.map((invitation) => (
                  <li className="list-item" key={invitation.id}>
                    <div className="list-item-main">
                      <strong className="truncate">{invitation.email}</strong>
                      <small className="muted">
                        {capitalise(invitation.role)} · expires {formatDate(invitation.expiresAt)}
                      </small>
                    </div>
                    <div className="list-item-actions">
                      <button
                        type="button"
                        className="button button-quiet button-small"
                        onClick={() => void revoke(invitation)}
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** Shows a pending invitation (token kept in sessionStorage from the #invite= link) and accepts it. */
export function InvitationPanel({
  hasFamily,
  onAccepted,
}: {
  hasFamily: boolean;
  onAccepted: (familyName: string) => Promise<void>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    familyName: string;
    invitedBy: string;
    role: FamilyRole;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(INVITE_STORAGE_KEY);
    if (!stored) return;
    queueMicrotask(() => setToken(stored));
    api<typeof preview>("/api/invitations/preview", {
      method: "POST",
      body: JSON.stringify({ token: stored }),
    })
      .then(setPreview)
      .catch((caught) => setError(errorText(caught)));
  }, []);

  if (!token) return null;

  function dismiss() {
    window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
    setToken(null);
  }

  async function accept() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ familyName: string }>("/api/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
      await onAccepted(result.familyName);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card invitation-panel" aria-labelledby="invitation-title">
      <p className="eyebrow">Family invitation</p>
      {preview ? (
        <>
          <h2 id="invitation-title">Join {preview.familyName}</h2>
          <p>
            {preview.invitedBy} invited you to join as {preview.role === "admin" ? "an" : "a"}{" "}
            <strong>{preview.role}</strong>. {ROLE_DESCRIPTIONS[preview.role]}
          </p>
          {hasFamily && (
            <p className="notice notice-warning">
              You already belong to a family. Leave it from Profile before accepting this
              invitation.
            </p>
          )}
        </>
      ) : (
        <h2 id="invitation-title">Checking your invitation…</h2>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="actions">
        {preview && !hasFamily && (
          <button type="button" className="button" disabled={busy} onClick={() => void accept()}>
            {busy ? "Joining…" : "Accept invitation"}
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
