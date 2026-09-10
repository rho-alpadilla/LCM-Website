import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import {
  parseCloudflareAccessConfiguration,
  verifyCloudflareAccessHeaders,
  verifyCloudflareAccessToken,
} from "./cloudflare-access";

const configuration = {
  teamDomain: "https://lifechangers-test.cloudflareaccess.com",
  audience: "test-application-audience",
};

async function createToken(
  privateKey: CryptoKey,
  overrides: {
    issuer?: string;
    audience?: string;
    email?: string;
    expirationTime?: string;
  } = {},
) {
  return new SignJWT({
    email: overrides.email ?? "ADMIN@EXAMPLE.COM",
    type: "app",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("access-user-1")
    .setIssuer(overrides.issuer ?? configuration.teamDomain)
    .setAudience(overrides.audience ?? configuration.audience)
    .setIssuedAt()
    .setExpirationTime(overrides.expirationTime ?? "5m")
    .sign(privateKey);
}

describe("Cloudflare Access identity verification", () => {
  it("accepts a correctly signed token and normalizes its email", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await createToken(privateKey);

    await expect(
      verifyCloudflareAccessToken(token, configuration, publicKey),
    ).resolves.toEqual({
      accessSubject: "access-user-1",
      email: "admin@example.com",
    });
  });

  it("rejects a request without the Access assertion header", async () => {
    await expect(
      verifyCloudflareAccessHeaders(new Headers(), {
        ACCESS_TEAM_DOMAIN: configuration.teamDomain,
        ACCESS_AUD: configuration.audience,
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it.each([
    ["wrong audience", { audience: "another-application" }],
    ["wrong issuer", { issuer: "https://other.cloudflareaccess.com" }],
    ["expired token", { expirationTime: "0s" }],
  ])("rejects a %s", async (_label, overrides) => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await createToken(privateKey, overrides);

    await expect(
      verifyCloudflareAccessToken(token, configuration, publicKey),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("rejects a token signed with an unapproved algorithm", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const token = await new SignJWT({
      email: "admin@example.com",
      type: "app",
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject("access-user-1")
      .setIssuer(configuration.teamDomain)
      .setAudience(configuration.audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(
      verifyCloudflareAccessToken(token, configuration, publicKey),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("rejects a token without a valid email claim", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await createToken(privateKey, { email: "not-an-email" });

    await expect(
      verifyCloudflareAccessToken(token, configuration, publicKey),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("rejects a token without an expiration claim", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({
      email: "admin@example.com",
      type: "app",
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject("access-user-1")
      .setIssuer(configuration.teamDomain)
      .setAudience(configuration.audience)
      .setIssuedAt()
      .sign(privateKey);

    await expect(
      verifyCloudflareAccessToken(token, configuration, publicKey),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("accepts only a clean HTTPS Cloudflare Access team origin", () => {
    expect(
      parseCloudflareAccessConfiguration({
        ACCESS_TEAM_DOMAIN: "https://lifechangers.cloudflareaccess.com",
        ACCESS_AUD: " audience-tag ",
      }),
    ).toEqual({
      teamDomain: "https://lifechangers.cloudflareaccess.com",
      audience: "audience-tag",
    });

    expect(() =>
      parseCloudflareAccessConfiguration({
        ACCESS_TEAM_DOMAIN: "http://lifechangers.cloudflareaccess.com",
        ACCESS_AUD: "audience-tag",
      }),
    ).toThrow(/configuration is invalid/i);
  });
});
