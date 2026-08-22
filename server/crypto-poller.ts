import { db } from "./db";
import { cryptoPayments, orders, users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getNowPaymentsInvoice, mapNowPaymentsStatus } from "./nowpayments";
import { storage } from "./storage";
import { log } from "./logger";

async function processCompletion(payment: typeof cryptoPayments.$inferSelect) {
  if (payment.purpose === "order" && payment.orderId) {
    await storage.fulfillPendingOrder(payment.orderId);
    await storage.createTransactionWithMethod(
      payment.userId,
      -payment.amount,
      "purchase",
      `Crypto order payment ($${(payment.amount / 100).toFixed(2)})`,
      "NOWPayments"
    );
  } else {
    await storage.updateUserBalance(payment.userId, payment.amount);
    await storage.updateProtectedBalance(payment.userId, payment.amount);
    await storage.createTransactionWithMethod(
      payment.userId,
      payment.amount,
      "deposit",
      `Crypto deposit ($${(payment.amount / 100).toFixed(2)})`,
      "NOWPayments"
    );
  }
}

export async function pollPendingCryptoPayments() {
  if (!process.env.NOWPAYMENTS_API_KEY) return;

  try {
    const pending = await db
      .select()
      .from(cryptoPayments)
      .where(inArray(cryptoPayments.status, ["pending", "underpaid"]));

    if (pending.length === 0) return;

    for (const payment of pending) {
      try {
        const invoice = await getNowPaymentsInvoice(payment.forebitPaymentId);
        const newStatus = mapNowPaymentsStatus(invoice.payment_status || invoice.status || "");

        if (newStatus === payment.status) continue;

        const [updated] = await db
          .update(cryptoPayments)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(and(eq(cryptoPayments.id, payment.id), eq(cryptoPayments.status, payment.status)))
          .returning();

        if (!updated) continue;

        if (newStatus === "completed") {
          await processCompletion(payment);
          log(`Auto-credited crypto payment ${payment.forebitPaymentId} ($${(payment.amount / 100).toFixed(2)}) for user ${payment.userId}`);
        } else if ((newStatus === "failed" || newStatus === "expired") && payment.purpose === "order" && payment.orderId) {
          await storage.cancelPendingOrder(payment.orderId);
          log(`Auto-cancelled order for failed crypto payment ${payment.forebitPaymentId}`);
        }
      } catch {
        // Skip individual errors silently
      }
    }
  } catch (err: any) {
    console.error("Crypto poller error:", err.message);
  }
}
