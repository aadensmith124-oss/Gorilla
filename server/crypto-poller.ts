import { db } from "./db";
import { cryptoPayments, orders, users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getForebitPayment } from "./forebit";
import { storage } from "./storage";
import { log } from "./index";

function mapForebitStatus(forebitStatus: string): "pending" | "completed" | "failed" | "expired" | "underpaid" {
  switch (forebitStatus?.toUpperCase()) {
    case "COMPLETED": case "PAID": case "CONFIRMED": case "DONE": case "SETTLED": return "completed";
    case "FAILED": case "CANCELLED": case "CANCELED": case "REJECTED": return "failed";
    case "EXPIRED": return "expired";
    case "UNDERPAID": case "PARTIAL": return "underpaid";
    default: return "pending";
  }
}

async function processForebitCompletion(payment: typeof cryptoPayments.$inferSelect) {
  if (payment.purpose === "order" && payment.orderId) {
    await storage.fulfillPendingOrder(payment.orderId);
    await storage.createTransactionWithMethod(
      payment.userId,
      -payment.amount,
      "purchase",
      `Crypto order payment via Forebit ($${(payment.amount / 100).toFixed(2)})`,
      "Forebit"
    );
  } else {
    await storage.updateUserBalance(payment.userId, payment.amount);
    await storage.updateProtectedBalance(payment.userId, payment.amount);
    await storage.createTransactionWithMethod(
      payment.userId,
      payment.amount,
      "deposit",
      `Crypto deposit via Forebit ($${(payment.amount / 100).toFixed(2)})`,
      "Forebit"
    );
  }
}

export async function pollPendingCryptoPayments() {
  if (!process.env.FOREBIT_ACCESS_KEY || !process.env.FOREBIT_ACCOUNT_ID) return;

  try {
    const pending = await db
      .select()
      .from(cryptoPayments)
      .where(inArray(cryptoPayments.status, ["pending", "underpaid"]));

    if (pending.length === 0) return;

    for (const payment of pending) {
      try {
        const resp = await getForebitPayment(payment.forebitPaymentId);
        const nested = resp.data || resp.payment || resp.result || {};
        const rawStatus = resp.status || (nested as any).status || "";
        const newStatus = mapForebitStatus(typeof rawStatus === "string" ? rawStatus : "");

        if (newStatus === payment.status) continue;

        const [updated] = await db
          .update(cryptoPayments)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(and(eq(cryptoPayments.id, payment.id), eq(cryptoPayments.status, payment.status)))
          .returning();

        if (!updated) continue;

        if (newStatus === "completed") {
          await processForebitCompletion(payment);
          log(`Auto-credited crypto payment ${payment.forebitPaymentId} ($${(payment.amount / 100).toFixed(2)}) for user ${payment.userId}`);
        } else if ((newStatus === "failed" || newStatus === "expired") && payment.purpose === "order" && payment.orderId) {
          await storage.cancelPendingOrder(payment.orderId);
          log(`Auto-cancelled order for failed crypto payment ${payment.forebitPaymentId}`);
        }
      } catch (err: any) {
        // Skip individual payment errors silently — don't crash the whole loop
      }
    }
  } catch (err: any) {
    console.error("Crypto poller error:", err.message);
  }
}
