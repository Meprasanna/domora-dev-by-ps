// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { startLogin } = vi.hoisted(() => ({ startLogin: vi.fn() }));
vi.mock("../client/src/const", () => ({ startLogin }));

import Login from "../client/src/pages/Login";

describe("Login page CTA", () => {
  beforeEach(() => {
    startLogin.mockClear();
  });

  it("invokes Manus OAuth when Continue securely is clicked", () => {
    render(React.createElement(Login));
    fireEvent.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(startLogin).toHaveBeenCalledOnce();
  });
});
