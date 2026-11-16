# bounty-board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/alexcarter88/bounty-board/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/alexcarter88/bounty-board/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A plain, fast front door to make.fun's public bounties: the board of live bounties with each one's pot, entry fee, time left and entries; a page for each bounty with its rewards, dates and rules; that bounty's leaderboard; and any account's public profile. Read-only, vanilla JavaScript, no build step — it only asks make.fun's public API for data, caches answers and revalidates them with ETags, and keeps the first load to six small files.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=g9an1vsd&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
