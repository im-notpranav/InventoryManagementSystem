// Warranty & subscription tracker: expiry maths, recipients and staged reminders.
//
// Reminder stages: 30, 7 and 1 day before expiry, then once on expiry (stage 0).
// Each record keeps `last_reminder` = the smallest stage already sent, so every
// stage fires exactly once. Renewing a record resets it to null.
// Recipients: the owning department's HOD(s) plus every super admin
// (an Admin without a department). Delivery: in-app notification + email.
const prisma = require('../config/db');
const { FRONTEND_URL, sameDept, notify } = require('./orderCycle');

const STAGES = [30, 7, 1, 0];
const SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'one_time'];
const PER_YEAR = { monthly: 12, quarterly: 4, yearly: 1, one_time: 0 };

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Whole days from today to `date` (negative once it has passed). */
const daysLeft = (date) => Math.round((startOfDay(date) - startOfDay()) / DAY_MS);

const statusOf = (days) => (days < 0 ? 'expired' : days <= SOON_DAYS ? 'expiring_soon' : 'active');

/** Reminder stage due for `days` left, or null when still outside the window. */
function stageFor(days) {
  if (days > STAGES[0]) return null;
  if (days <= 0) return 0;
  if (days <= 1) return 1;
  if (days <= 7) return 7;
  return 30;
}

const isDue = (stage, last) => stage != null && (last == null || stage < last);

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // 31 Jan + 1 month → 28/29 Feb, not 3 Mar
  return d;
}

/** Next renewal date after `date` for a billing cycle, or null for one-time purchases. */
const nextRenewal = (date, cycle) => (CYCLE_MONTHS[cycle] ? addMonths(date, CYCLE_MONTHS[cycle]) : null);

const enrichWarranty = (w) => {
  const days_remaining = daysLeft(w.end_date);
  return { ...w, days_remaining, status: statusOf(days_remaining) };
};

const enrichSubscription = (s) => {
  const days_remaining = daysLeft(s.expiry_date);
  const cost = s.cost == null ? null : Number(s.cost);
  return {
    ...s,
    cost,
    annual_cost: cost == null ? null : cost * (PER_YEAR[s.billing_cycle] ?? 1),
    days_remaining,
    status: statusOf(days_remaining),
  };
};

async function recipientsFor(department) {
  const admins = await prisma.user.findMany({
    where: { role: { role_name: 'Admin' }, is_active: true },
    select: { user_id: true, name: true, email: true, department: true },
  });
  return admins.filter((a) => !a.department || sameDept(a.department, department));
}

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function whenText(days) {
  if (days < 0) return `expired ${Math.abs(days)} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'expires today';
  return `expires in ${days} day${days === 1 ? '' : 's'}`;
}

// ── Per-record reminders ─────────────────────────────────────
// The conditional updateMany claims the stage first, so two overlapping runs
// (startup + cron, or a save during a run) never send the same reminder twice.

async function remindWarranty(w) {
  const days = daysLeft(w.end_date);
  const stage = stageFor(days);
  if (!isDue(stage, w.last_reminder)) return false;
  const claimed = await prisma.warranty.updateMany({
    where: { warranty_id: w.warranty_id, last_reminder: w.last_reminder },
    data: { last_reminder: stage },
  });
  if (!claimed.count) return false;

  const item = w.product?.name || 'Equipment';
  const label = `${item}${w.serial_number ? ` (SN ${w.serial_number})` : w.quantity > 1 ? ` ×${w.quantity}` : ''}`;
  const link = `/warranties?tab=warranties&id=${w.warranty_id}`;
  await notify(await recipientsFor(w.department), {
    type: days <= 0 ? 'warranty_expired' : 'warranty_expiring',
    message: `Warranty for ${label} ${whenText(days)} (${fmt(w.end_date)}) · ${w.department}`,
    link,
    email: {
      subject: `${days <= 0 ? '[Expired]' : '[Reminder]'} Warranty: ${label} ${whenText(days)}`,
      heading: days <= 0 ? 'Warranty has expired' : 'Warranty ending soon',
      intro: days <= 0
        ? 'Coverage for this item has ended. Renew it with the vendor or plan a replacement.'
        : 'Contact the vendor about an extension, or raise a purchase request if a replacement is needed.',
      rows: [
        ['Item', label],
        ['Department', w.department],
        ['Vendor', w.vendor?.vendor_name],
        ['Work order', w.wo?.wo_number],
        ['Coverage ends', fmt(w.end_date)],
        ['Status', whenText(days)],
      ],
      cta: { label: 'Open tracker', url: `${FRONTEND_URL()}${link}` },
    },
  });
  return true;
}

async function remindSubscription(s) {
  const days = daysLeft(s.expiry_date);
  const stage = stageFor(days);
  if (!isDue(stage, s.last_reminder)) return false;
  const claimed = await prisma.subscription.updateMany({
    where: { subscription_id: s.subscription_id, last_reminder: s.last_reminder },
    data: { last_reminder: stage },
  });
  if (!claimed.count) return false;

  const name = `${s.service_name}${s.plan ? ` (${s.plan})` : ''}`;
  const link = `/warranties?tab=subscriptions&id=${s.subscription_id}`;
  const action = s.auto_renew
    ? 'It is set to auto-renew. Check that the payment method is valid, or cancel it if it is no longer needed.'
    : 'Renew it before it lapses, then record the new renewal date in the tracker.';
  await notify(await recipientsFor(s.department), {
    type: days <= 0 ? 'subscription_expired' : 'subscription_renewal',
    message: `${name} ${s.auto_renew ? (days <= 0 ? 'renewal due today' : `auto-renews in ${days} day${days === 1 ? '' : 's'}`) : whenText(days)} (${fmt(s.expiry_date)}) · ${s.department}`,
    link,
    email: {
      subject: `${days <= 0 ? '[Expired]' : '[Renewal]'} ${name} ${whenText(days)}`,
      heading: days <= 0 ? 'Subscription has reached its end date' : 'Subscription renewal coming up',
      intro: action,
      rows: [
        ['Service', name],
        ['Provider', s.provider],
        ['Department', s.department],
        ['Seats', s.seats],
        ['Cost', s.cost != null ? `₹${Number(s.cost).toLocaleString('en-IN')} / ${String(s.billing_cycle).replace('_', ' ')}` : null],
        ['Renewal date', fmt(s.expiry_date)],
        ['Auto-renew', s.auto_renew ? 'Yes' : 'No'],
      ],
      cta: { label: 'Open tracker', url: `${FRONTEND_URL()}${link}` },
    },
  });
  return true;
}

// An auto-renewing subscription that has passed its date rolls forward one cycle
// at a time until it is current again, and the owners are told to confirm payment.
async function rollAutoRenewals() {
  const lapsed = await prisma.subscription.findMany({
    where: { auto_renew: true, billing_cycle: { in: Object.keys(CYCLE_MONTHS) }, expiry_date: { lt: startOfDay() } },
  });
  let rolled = 0;
  for (const s of lapsed) {
    let next = new Date(s.expiry_date);
    while (startOfDay(next) < startOfDay()) next = nextRenewal(next, s.billing_cycle);
    const updated = await prisma.subscription.updateMany({
      where: { subscription_id: s.subscription_id, expiry_date: s.expiry_date },
      data: { expiry_date: next, renewed_at: new Date(), last_reminder: null },
    });
    if (!updated.count) continue;
    rolled++;
    const link = `/warranties?tab=subscriptions&id=${s.subscription_id}`;
    await notify(await recipientsFor(s.department), {
      type: 'subscription_renewed',
      message: `${s.service_name} auto-renewed. Next renewal ${fmt(next)}. Confirm the payment went through.`,
      link,
      email: {
        subject: `Auto-renewed: ${s.service_name}`,
        heading: 'Subscription auto-renewed',
        intro: 'The tracker moved this subscription to its next cycle. Confirm with the provider that the payment went through.',
        rows: [['Service', s.service_name], ['Department', s.department], ['Previous date', fmt(s.expiry_date)], ['Next renewal', fmt(next)]],
        cta: { label: 'Open tracker', url: `${FRONTEND_URL()}${link}` },
      },
    });
  }
  return rolled;
}

// ── Full run (daily cron + shortly after boot) ───────────────
let running = null;

async function runReminders() {
  if (running) return running; // never overlap two runs
  running = (async () => {
    const horizon = new Date(startOfDay().getTime() + (STAGES[0] + 1) * DAY_MS);
    const pending = { OR: [{ last_reminder: null }, { last_reminder: { gt: 0 } }] };
    const rolled = await rollAutoRenewals();
    const [warranties, subscriptions] = await Promise.all([
      prisma.warranty.findMany({
        where: { end_date: { lt: horizon }, ...pending },
        include: { product: { select: { name: true } }, vendor: { select: { vendor_name: true } }, wo: { select: { wo_number: true } } },
      }),
      prisma.subscription.findMany({ where: { expiry_date: { lt: horizon }, ...pending } }),
    ]);
    let w = 0;
    let s = 0;
    for (const item of warranties) if (await remindWarranty(item).catch((e) => console.error('[TRACKER]', e.message))) w++;
    for (const item of subscriptions) if (await remindSubscription(item).catch((e) => console.error('[TRACKER]', e.message))) s++;
    return { warranties: w, subscriptions: s, auto_renewed: rolled };
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

module.exports = {
  STAGES,
  SOON_DAYS,
  BILLING_CYCLES,
  daysLeft,
  statusOf,
  stageFor,
  addMonths,
  nextRenewal,
  enrichWarranty,
  enrichSubscription,
  recipientsFor,
  remindWarranty,
  remindSubscription,
  runReminders,
};
