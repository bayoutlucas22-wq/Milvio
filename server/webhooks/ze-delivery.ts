import type { Express, Request, Response } from "express";
import { upsertOrderEvent } from "../integrations/ze-delivery/db";

export function registerZeDeliveryWebhook(app: Express) {
  app.post("/api/webhooks/ze-delivery", async (req: Request, res: Response) => {
    try {
      const payload = req.body ?? {};
      const event = {
        eventId: String(payload.eventId ?? payload.id ?? ""),
        orderId: String(payload.orderId ?? payload.order_id ?? ""),
        merchantId: String(payload.merchantId ?? payload.merchant_id ?? ""),
        eventType: String(payload.eventType ?? payload.type ?? "EDITED") as
          | "CREATED"
          | "CONFIRMED"
          | "DISPATCHED"
          | "CANCELLED"
          | "CONCLUDED"
          | "EDITED",
        sourceAppId: payload.sourceAppId ? String(payload.sourceAppId) : null,
        isAcknowledged: false,
        eventCreatedAt: payload.eventCreatedAt ? new Date(payload.eventCreatedAt) : null,
      };

      if (!event.eventId || !event.orderId || !event.merchantId) {
        return res.status(400).json({ success: false, message: "Missing eventId, orderId or merchantId" });
      }

      const saved = await upsertOrderEvent(event as any);
      return res.json({ success: true, event: saved });
    } catch (error) {
      console.error("[ZeDeliveryWebhook]", error);
      return res.status(500).json({ success: false, message: "Failed to process webhook" });
    }
  });
}
