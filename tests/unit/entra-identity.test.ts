import { describe, expect, it } from "vitest";
import { MICROSOFT_CONSUMER_TENANT_ID, resolveEntraIdentity } from "@/lib/entra-identity";

const workTenant = "11111111-2222-3333-4444-555555555555";
const oid = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";

describe("Entra identity resolution", () => {
  it("keys accounts on the immutable tenant and object IDs", () => {
    const identity = resolveEntraIdentity({
      tid: workTenant,
      oid,
      email: "Parent@Example.com",
      name: "Pat Parent",
    });
    expect(identity?.subject).toBe(`${workTenant}:${oid.toLowerCase()}`);
    expect(identity?.name).toBe("Pat Parent");
  });

  it("trusts email from personal Microsoft accounts", () => {
    const identity = resolveEntraIdentity({
      tid: MICROSOFT_CONSUMER_TENANT_ID,
      oid,
      email: "Parent@Outlook.com",
    });
    expect(identity?.verifiedEmail).toBe("parent@outlook.com");
  });

  it("does not trust work or school email unless the tenant asserts domain ownership", () => {
    expect(resolveEntraIdentity({ tid: workTenant, oid, email: "ceo@victim.example" })).toEqual(
      expect.objectContaining({ verifiedEmail: null }),
    );
    expect(
      resolveEntraIdentity({ tid: workTenant, oid, email: "pat@contoso.example", xms_edov: true })
        ?.verifiedEmail,
    ).toBe("pat@contoso.example");
    expect(
      resolveEntraIdentity({ tid: workTenant, oid, email: "pat@contoso.example", xms_edov: false })
        ?.verifiedEmail,
    ).toBeNull();
  });

  it("rejects tokens without valid tenant or object identifiers", () => {
    expect(resolveEntraIdentity({ oid, email: "a@b.example" })).toBeNull();
    expect(resolveEntraIdentity({ tid: workTenant, oid: "not-a-guid" })).toBeNull();
    expect(resolveEntraIdentity({ tid: 42, oid })).toBeNull();
  });

  it("ignores malformed email claims and bounds display names", () => {
    const identity = resolveEntraIdentity({
      tid: MICROSOFT_CONSUMER_TENANT_ID,
      oid,
      email: "not an email",
      name: "x".repeat(200),
    });
    expect(identity?.verifiedEmail).toBeNull();
    expect(identity?.name).toHaveLength(80);
  });
});
