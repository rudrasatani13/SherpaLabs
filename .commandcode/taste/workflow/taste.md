# Workflow

- When user provides a detailed phase specification followed by "continue", begin implementation immediately. Confidence: 0.85
- When user says "merge it" or "create PR and merge it" after work is complete, create a PR and merge to main. Confidence: 0.85
- When user says "commit and push", commit changes and push to remote immediately. Confidence: 0.80
- When user says "now i have done all the manual things now check and verify", verify the work and proceed with next steps. Confidence: 0.80
- When user asks "so what have i do manually ??", enumerate remaining manual steps they need to complete. Confidence: 0.75
- When user asks "can you do it ?", confirm capability to perform the requested task (often GitHub/branch operations). Confidence: 0.75
- When user asks "we are ready to merge ?", confirm PR readiness before merging. Confidence: 0.75
- When user says "try again", retry the failed operation. Confidence: 0.70
- When user says "ok merge it" or "ok now merge it", proceed with merging immediately. Confidence: 0.80
- When user says "you just check it and do it", verify the state and take action without further prompting. Confidence: 0.75
- When user says "ok i have approved", acknowledge and proceed with next steps (often merging). Confidence: 0.75
- When user says "there are one more PR is open merge it also", check for and merge additional open PRs. Confidence: 0.75
- When user says "done i have joined now ?", confirm completion and proceed. Confidence: 0.70
- When user says "done cloudflare redirect update" or similar "done [task]" messages, acknowledge completion and continue. Confidence: 0.70
- When user reports "[name] already taken" or similar, treat as a blocker requiring alternative approach. Confidence: 0.70
