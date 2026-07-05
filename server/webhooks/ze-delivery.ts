import type { Express, Request, Response } from "express";
import { upsertOrderEvent } from "../zeDeliveryDb";
import type { ZeWebhookDeliveryPayload } from "../zeDeliveryClient";

type IncomingWebhookPayload = Partial<ZeWebhookDeliveryPayload> & {
  eventId?: string;
  orderId?: string | number;
  merchantId?: string | number;
  eventType?: string;
  sourceAppId?: string;
  createdAt?: string;
  data?: Partial<ZeWebhookDeliveryPayload["data"]>;
};

function normalizePayload(payload: IncomingWebhookPayload) {
  const data = (payload.data ?? {}) as Partial<ZeWebhookDeliveryPayload["data"]>;
  return {
    eventId: String(data.eventId ?? payload.eventId ?? ""),
    orderId: String(data.orderId ?? payload.orderId ?? ""),
    merchantId: String(data.merchantId ?? payload.merchantId ?? ""),
    eventType: String(data.eventType ?? payload.eventType ?? "EDITED"),
    sourceAppId: String(payload.sourceAppId ?? ""),
    eventCreatedAt: data.createdAt ?? payload.createdAt ?? null,
  };
}

export function registerZeDeliveryWebhook(app: Express) {
  app.post("/api/webhooks/ze-delivery", async (req: Request, res: Response) => {
    try {
      const payload = normalizePayload((req.body ?? {}) as IncomingWebhookPayload);

      if (!payload.eventId || !payload.orderId || !payload.merchantId) {
        return res.status(400).json({
          success: false,
          message: "Missing eventId, orderId or merchantId",
        });
      }

      const saved = await upsertOrderEvent({
        eventId: payload.eventId,
        orderId: payload.orderId,
        merchantId: payload.merchantId,
        eventType: payload.eventType as
          | "CREATED"
          | "CONFIRMED"
          | "READY_FOR_PICKUP"
          | "DISPATCHED"
          | "CANCELLED"
          | "CONCLUDED"
          | "EDITED",
        sourceAppId: payload.sourceAppId || null,
        isAcknowledged: false,
        acknowledgedAt: null,
        eventCreatedAt: payload.eventCreatedAt ? new Date(payload.eventCreatedAt) : null,
      });

      return res.json({ success: true, event: saved });
    } catch (error) {
      console.error("[ZeDeliveryWebhook]", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process webhook",
      });
    }
  });
}
