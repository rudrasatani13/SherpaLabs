# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Workflow

See [workflow/taste.md](workflow/taste.md)

# Communication

- When user asks "how can i...", provide step-by-step instructions. Confidence: 0.70
- When user asks "where can i see...", provide location/path information. Confidence: 0.70
- When user provides specific info like "username : [value]", use that value for subsequent operations. Confidence: 0.70
- When user says "done now ?/" or similar, confirm completion status. Confidence: 0.70
- When user says "ok so we have...", acknowledge state change and address the follow-up question. Confidence: 0.70
