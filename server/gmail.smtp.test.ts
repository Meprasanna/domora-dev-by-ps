import { describe, expect, it } from "vitest";
import tls from "node:tls";

function smtpCommand(socket: tls.TLSSocket, command: string) {
  socket.write(`${command}\r\n`);
}

function readSmtpResponse(socket: tls.TLSSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      const last = lines.at(-2) ?? "";
      if (/^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

const configured = Boolean(
  process.env.GMAIL_SMTP_USER && process.env.GMAIL_SMTP_APP_PASSWORD,
);

describe("Gmail SMTP integration", () => {
  it("authenticates against Gmail SMTP over TLS", async () => {
    if (!configured) return;

    const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
    try {
      await readSmtpResponse(socket);
      smtpCommand(socket, "EHLO domora.local");
      await readSmtpResponse(socket);
      smtpCommand(socket, "AUTH LOGIN");
      await readSmtpResponse(socket);
      smtpCommand(socket, Buffer.from(process.env.GMAIL_SMTP_USER ?? "").toString("base64"));
      await readSmtpResponse(socket);
      smtpCommand(socket, Buffer.from(process.env.GMAIL_SMTP_APP_PASSWORD ?? "").toString("base64"));
      const authenticated = await readSmtpResponse(socket);
      expect(authenticated).toMatch(/^235|\r\n235 /m);
      smtpCommand(socket, "QUIT");
    } finally {
      socket.end();
    }
  }, 20_000);
});
