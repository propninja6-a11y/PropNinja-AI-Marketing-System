export async function generateCallScript(lead) {
  const segment = lead.segment || "end-user";
  const project = lead.project || "premium apartments";
  const location = lead.location || "Bangalore";
  const budget = lead.budget || "N/A";

  if (segment === "investor") {
    return `Hi ${lead.name || "there"}, this is PropNinja.

I saw your interest in ${project} at ${location}. With your budget around ${budget}, this is positioned for ROI.
- Rental demand and infra growth are strong
- Pre-launch pricing window can close soon
- Builder credibility is high

Can I book a short site visit this weekend to evaluate yield options?`;
  }

  if (segment === "budget-sensitive") {
    return `Hi ${lead.name || "there"}, this is PropNinja.

You were exploring ${project} in ${location}. For your budget around ${budget}, we can focus on value options:
- EMI-friendly units
- Current launch offers
- Best total-cost options

Should I reserve a quick site visit slot this weekend?`;
  }

  return `Hi ${lead.name || "there"}, this is PropNinja.

I saw your interest in ${project} in ${location}.

Just quickly:
Are you looking for investment or end-use?

Based on your response, I can guide you on:
- urgency (pre-launch / price movement),
- location advantage and builder credibility,
- best fit options in your budget (${budget}).

Can I block a quick site visit slot for you this weekend?`;
}
