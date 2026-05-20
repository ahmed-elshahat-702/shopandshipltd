import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("Auth Validations", () => {
  describe("loginSchema", () => {
    it("should validate correct login data", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should fail on invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Please enter a valid email address",
        );
      }
    });

    it("should fail on short password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Password must be at least 6 characters",
        );
      }
    });
  });

  describe("registerSchema", () => {
    it("should validate correct registration data", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      });
      expect(result.success).toBe(true);
    });

    it("should fail if passwords do not match", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "DifferentPassword123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords do not match");
      }
    });

    it("should fail if password lacks uppercase letter", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((e) => e.message.includes("uppercase")),
        ).toBe(true);
      }
    });
  });
});
