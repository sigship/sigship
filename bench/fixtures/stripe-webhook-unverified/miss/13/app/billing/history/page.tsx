const LABELS: Record<string, string> = { 'invoice.paid': 'Paid', 'customer.subscription.updated': 'Plan changed' };
export default function History({ events }) { return <ul>{events.map((e) => <li key={e.id}>{LABELS[e.type] ?? e.type}</li>)}</ul>; }
