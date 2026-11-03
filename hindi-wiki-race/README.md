# Hindi Wikipedia race: Prism vs Jev

A split-screen WikiRace on Hindi Wikipedia. Sarvam Prism and Jev start on the same article and, each hop, pick the link that gets closer to a target. It follows the loop from [Jev's wikiracer](https://jevtypesafeai.com/games/jev-wikiracer): read the page, list the article links, ask one `choice` question, click the answer.

The point is Sarvam's claim that Prism is stronger in Indian languages. Both models see the same Hindi state, the same Hindi question, and the same shortlist. Whoever is looking does not get English titles or a private map of Wikipedia.

## What a hop does

1. Load the current article from `hi.wikipedia.org` (namespace 0 links only).
2. If the target, or a redirect to it, is linked, take that hop. No model call, no cost.
3. Otherwise drop the main page, "list of" articles, pages already visited, and red links (titles with no article).
4. Keep titles that share a word with the target, then fill the rest so the list is at most 48 links. This is the same shortlist shape Jev's demo uses, so a page with hundreds of links still fits the 255-option cap.
5. Ask both models, in parallel once their paths diverge:

```text
आप हिन्दी विकिपीडिया के लेख "{current}" पर हैं। लक्ष्य लेख: "{target}"।
```

Question: `इन कड़ियों में से कौन सी कड़ी लक्ष्य लेख के सबसे करीब ले जाती है?`

A pick that is not one of those links stops that runner. Ten hops is the limit.

## Steps, speed, cost

These stay separate. Fewer hops is not converted into a speed score.

- **Steps.** Finished races only. A runner who never reaches the target does not win on steps.
- **Speed.** API round trip for model hops. Wikipedia time is not included. This is not the on-GPU latency in Sarvam's blog.
- **Cost.** From each response's `input_tokens`. Prism is ₹4 per million input tokens. Jev is $0.042 per million. Output tokens are free on both. Rupees are also shown in dollars at the rate stored in `data/results.json`.

## Run

```bash
cd hindi-wiki-race
npm test
npm run preflight   # resolve Hindi titles, drop one-click pairs
npm run race        # 16 races; resumes if data/results.json already has some
npm start           # http://127.0.0.1:4173
```

`SARVAM_API_KEY` and `JEV_API_KEY` are read from the environment. `npm run race -- --only chai-philosophy` reruns one pair. `--fresh` ignores saved races.

Open the page and press **Start the race**. It replays the saved decisions, then lands on the comparison.
