function scoreLead(lead) {
  let score = 0;
  const budget = Number(lead.budget || 0);
  if (budget > 10000000) score += 30;
  if (lead.location) score += 20;
  if (lead.project) score += 10;
  return score;
}

export async function prioritizeLeads(leads) {
  return [...leads].sort((a, b) => scoreLead(b) - scoreLead(a));
}

export { scoreLead };
