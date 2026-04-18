/**
 * Shared Facebook insights field mapping for campaigns, adsets, ads.
 * Includes messaging detection, objective-aware results, and ROAS computation.
 */

export const INSIGHTS_FIELDS = 'spend,impressions,reach,clicks,ctr,cpm,frequency,actions,action_values,cost_per_action_type,purchase_roas';

// G1: Messaging action detection (8-level priority)
const MESSAGING_ACTION_PRIORITY = [
  'onsite_conversion.messaging_conversation_started_7d',
  'messaging_conversation_started_7d',
  'onsite_conversion.messaging_first_reply',
  'messaging_first_reply',
  'onsite_conversion.messaging_block',
  'messaging_block',
  'message',
  'messaging_conversation_started',
];

// G2: Purchase action detection (6-level priority)
const PURCHASE_PRIORITY = [
  'omni_purchase', 'purchase', 'website_purchase',
  'mobile_app_purchase', 'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.purchase',
];

// G2: Objective → action type mapping
const OBJECTIVE_MAP: Record<string, string[]> = {
  'OUTCOME_ENGAGEMENT': MESSAGING_ACTION_PRIORITY,
  'MESSAGES': MESSAGING_ACTION_PRIORITY,
  'OUTCOME_SALES': PURCHASE_PRIORITY,
  'CONVERSIONS': PURCHASE_PRIORITY,
  'OUTCOME_LEADS': ['offsite_conversion.fb_pixel_lead', 'lead'],
  'LINK_CLICKS': ['link_click'],
  'OUTCOME_TRAFFIC': ['link_click'],
  'OUTCOME_AWARENESS': [],
};

function findAction(actions: any[] | undefined, types: string[]): { action: any; type: string } | null {
  if (!actions) return null;

  for (const type of types) {
    const found = actions.find((a: any) => a.action_type === type);
    if (found) return { action: found, type };
  }

  return null;
}

function getMessagingResults(actions: any[] | undefined, spend: number) {
  const match = findAction(actions, MESSAGING_ACTION_PRIORITY);

  if (!match) return { messages: 0, costPerMessage: 0, messagingActionType: null };

  const messages = parseFloat(match.action.value);

  return {
    messages,
    costPerMessage: messages > 0 ? +(spend / messages).toFixed(2) : 0,
    messagingActionType: match.type,
  };
}

function computeResults(actions: any[] | undefined, costPerActionType: any[] | undefined, objective: string | undefined, spend: number) {
  // Stage 1: Try objective-specific action types
  if (objective) {
    const priorityTypes = OBJECTIVE_MAP[objective];

    if (priorityTypes?.length) {
      const match = findAction(actions, priorityTypes);

      if (match) {
        const results = parseFloat(match.action.value);
        const cpr = costPerActionType?.find((a: any) => a.action_type === match.type);
        const costPerResult = cpr ? parseFloat(cpr.value) : (results > 0 ? +(spend / results).toFixed(2) : 0);
        const typeLabel = MESSAGING_ACTION_PRIORITY.includes(match.type) ? 'messages'
          : PURCHASE_PRIORITY.includes(match.type) ? 'purchases'
          : match.type.includes('lead') ? 'leads'
          : match.type.includes('link_click') ? 'link_clicks'
          : 'other';

        return { results, resultType: typeLabel, costPerResult: +costPerResult.toFixed(2) };
      }
    }
  }

  // Stage 2: Try messaging actions
  const msgMatch = findAction(actions, MESSAGING_ACTION_PRIORITY);

  if (msgMatch) {
    const results = parseFloat(msgMatch.action.value);
    return { results, resultType: 'messages' as const, costPerResult: results > 0 ? +(spend / results).toFixed(2) : 0 };
  }

  // Stage 3: Try purchase actions
  const purchaseMatch = findAction(actions, PURCHASE_PRIORITY);

  if (purchaseMatch) {
    const results = parseFloat(purchaseMatch.action.value);
    const cpr = costPerActionType?.find((a: any) => a.action_type === purchaseMatch.type);
    return { results, resultType: 'purchases' as const, costPerResult: cpr ? +parseFloat(cpr.value).toFixed(2) : (results > 0 ? +(spend / results).toFixed(2) : 0) };
  }

  // Stage 4: Fallback — first action
  if (actions?.length) {
    const first = actions[0];
    const results = parseFloat(first.value);
    return { results, resultType: 'other' as const, costPerResult: results > 0 ? +(spend / results).toFixed(2) : 0 };
  }

  return { results: 0, resultType: null, costPerResult: 0 };
}

export interface MappedInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
  results: number;
  resultType: string | null;
  costPerResult: number;
  roas: number;
  purchases: number;
  revenue: number;
  costPerPurchase: number;
  messages: number;
  costPerMessage: number;
  messagingActionType: string | null;
}

/**
 * Map raw Facebook insights row to computed response format.
 * @param raw - FB insights row
 * @param objective - campaign objective (for result type detection)
 */
export function mapInsights(raw: any, objective?: string): MappedInsights | null {
  if (!raw) return null;

  const spend = parseFloat(raw.spend || '0');
  const impressions = parseFloat(raw.impressions || '0');
  const reach = parseFloat(raw.reach || '0');
  const clicks = parseFloat(raw.clicks || '0');
  const ctr = parseFloat(raw.ctr || '0');
  const cpm = parseFloat(raw.cpm || '0');
  const frequency = parseFloat(raw.frequency || '0');

  // Purchase detection
  const purchaseMatch = findAction(raw.actions, PURCHASE_PRIORITY);
  const purchases = purchaseMatch ? parseFloat(purchaseMatch.action.value) : 0;

  const purchaseValueMatch = findAction(raw.action_values, PURCHASE_PRIORITY);
  const revenue = purchaseValueMatch ? parseFloat(purchaseValueMatch.action.value) : 0;

  // ROAS: prefer FB native, fallback to computed
  const fbRoas = raw.purchase_roas?.find((a: any) => PURCHASE_PRIORITY.includes(a.action_type));
  const roas = fbRoas ? +parseFloat(fbRoas.value).toFixed(2) : (spend > 0 ? +(revenue / spend).toFixed(2) : 0);

  // Objective-aware results
  const { results, resultType, costPerResult } = computeResults(raw.actions, raw.cost_per_action_type, objective, spend);

  // Messaging
  const { messages, costPerMessage, messagingActionType } = getMessagingResults(raw.actions, spend);

  return {
    spend: +spend.toFixed(2),
    impressions,
    reach,
    clicks,
    ctr: +ctr.toFixed(2),
    cpm: +cpm.toFixed(2),
    frequency: +frequency.toFixed(2),
    results,
    resultType,
    costPerResult,
    roas,
    purchases,
    revenue: +revenue.toFixed(2),
    costPerPurchase: purchases > 0 ? +(spend / purchases).toFixed(2) : 0,
    messages,
    costPerMessage,
    messagingActionType,
  };
}
