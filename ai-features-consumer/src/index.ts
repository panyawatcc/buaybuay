// ai-features-consumer — Worker that consumes ai-features-queue
// Scaffold only (Week 0 SI). BACKEND SI-5 fills in real handlers per `feature`.
//
// Message shape (producer side, in Pages Function):
//   await env.AI_FEATURES_QUEUE.send({
//     feature: 'copywriter' | 'retargeting' | 'crm' | 'trends' | 'ltv',
//     user_id: string,
//     payload: Record<string, unknown>,
//   });

export interface Env {
  // Future bindings — D1, secrets, service bindings — wired by BACKEND as needed.
}

interface FeatureMessage {
  feature: 'copywriter' | 'retargeting' | 'crm' | 'trends' | 'ltv';
  user_id: string;
  payload: Record<string, unknown>;
}

export default {
  async queue(batch: MessageBatch<FeatureMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        console.log(
          `[ai-consumer] processing feature=${msg.body.feature} user=${msg.body.user_id} ts=${msg.timestamp}`,
        );
        // TODO (BACKEND SI-5): dispatch by feature to actual handler
        msg.ack();
      } catch (err) {
        console.error(`[ai-consumer] failed feature=${msg.body?.feature}: ${err}`);
        msg.retry(); // goes to DLQ after max_retries=3
      }
    }
  },
};
