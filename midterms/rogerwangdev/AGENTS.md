# Gold Miner checkpoint

Work only in this project and its dedicated course CI workflow. The student owns design decisions. Keep upstream files unchanged under `vendor/gold-miner` and record their revision and hashes in `SOURCE.json`. Implement adaptations outside that directory.

For engine, observation, action, or outcome changes, invoke the project skill `gold-miner-rule-change` by name. Follow the parent repository's evidence-first procedure using this project's `docs/rule-source-map.md`, `src/`, and `test/`. Use Node's built-in test runner (`npm test`) for this JavaScript project. Keep imported rules distinct from deliberate design adaptations.

For a decision-interval change, read the skill's `references/simulation-timing.md` and use `npm run check:timing`. An instruction to improve the skill does not itself change the game's interval. Record focused invocation/task/result evidence in `docs/skill-use.md`. Keep full conversations, planning notes and internal tracking outside the repository.

The engine owns authoritative state. Players get JSON observations and legal actions only. Model output is validated data. Live calls require an explicit provider choice and configured credentials. No automatic retries or silent replacement of failed model actions. Keep secrets and personal playtester details out of traces.

Request independent read-only review from a fresh agent or session after implementation. This authoring session cannot mark its changes independently reviewed. The student's final `AGENT-TEAM.md` must be written in their own voice. Keep missing live trials, peer observations, and student reflection explicitly pending.
