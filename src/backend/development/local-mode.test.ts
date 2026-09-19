import { describe, expect, it } from "vitest";

import {
  assertPayMongoUnavailableInLocalDevelopment,
  localDevelopmentConfiguration,
} from "./local-mode";

const localEnvironment = { APP_ENVIRONMENT: "local" };

describe("local development mode", () => {
  it("allows the local developer administrator only for a loopback development request", () => {
    expect(
      localDevelopmentConfiguration(
        localEnvironment,
        "localhost:3000",
        "development",
      ),
    ).toEqual({ hostname: "localhost" });
    expect(
      localDevelopmentConfiguration(
        localEnvironment,
        "127.0.0.1:3000",
        "development",
      ),
    ).toEqual({ hostname: "127.0.0.1" });
  });

  it.each([
    ["a network host", localEnvironment, "192.168.1.104:3000", "development"],
    ["a production process", localEnvironment, "localhost:3000", "production"],
    [
      "a preview binding",
      { APP_ENVIRONMENT: "preview" },
      "localhost:3000",
      "development",
    ],
    [
      "a production binding",
      { APP_ENVIRONMENT: "production" },
      "localhost:3000",
      "development",
    ],
  ] as const)("rejects %s", (_label, environment, host, nodeEnvironment) => {
    expect(
      localDevelopmentConfiguration(environment, host, nodeEnvironment),
    ).toBeNull();
  });

  it("blocks PayMongo before test-mode configuration is deliberately added", () => {
    expect(() =>
      assertPayMongoUnavailableInLocalDevelopment(
        localEnvironment,
        "development",
      ),
    ).toThrow(/PayMongo is unavailable/i);
    expect(() =>
      assertPayMongoUnavailableInLocalDevelopment(
        { APP_ENVIRONMENT: "preview" },
        "development",
      ),
    ).not.toThrow();
  });
});
