# Tacta - Business Ideation & Strategy

## 🚀 Executive Summary
Tacta is a crowd-sourced sports analytics platform that gamifies data collection. By leveraging a community of users via a Telegram bot, we convert raw match footage into professional-grade statistical data. We solve the problem of expensive analytics for amateur/semi-pro leagues while providing an engaging, competitive experience for football fans.

---

## 🧐 The Problem
1.  **Data Gap**: 99% of football matches (amateur, youth, lower leagues) go unanalyzed because professional tools (Opta, Wyscout) are too expensive.
2.  **Passive Fandom**: Fans consume content passively but crave deeper engagement and recognition for their tactical knowledge.
3.  **Scouting Blindspots**: Talented players in lower leagues are missed due to lack of performance data.

## 💡 The Solution: TactaBot
A "Human-in-the-Loop" AI system where users act as data labelers in exchange for status and rewards.

### Core Loop
1.  **Upload**: Leagues/Clubs upload full match videos.
2.  **Slice**: System cuts video into 5-10 second clips.
3.  **Tag**: Users watch clips on Telegram and identify events (Goal, Pass, Press, etc.).
4.  **Verify**: Our "Consensus Engine" validates data using user Trust Scores.
5.  **Publish**: Verified stats are generated for the teams.

---

## ⚙️ Key Features (Implemented)
*   **Telegram Mini-App Interface**: Low barrier to entry, no app download needed.
*   **Trust Score System**:
    *   Users start at 50 Trust.
    *   Correct tags (matching consensus) increase trust.
    *   Spamming or wrong tags decrease trust.
    *   *Business Value*: Ensures high data quality without paid employees.
*   **Gamification**:
    *   **XP & Leveling**: Instant gratification for work done.
    *   **Streaks**: Retention mechanic to encourage daily use.
    *   **Badges**: Bronze/Silver/Gold milestones for long-term engagement.
    *   **Leaderboards**: Weekly competitions to drive "super-user" behavior.
*   **Quality Control Pipeline**:
    *   *Stage 1*: Rule Validation (Spam checks).
    *   *Stage 2*: Crowd Consensus (3 matching votes).
    *   *Stage 3*: Elite Review (Ambiguous clips sent to high-trust users).

---

## 💰 Monetization Strategy

### 1. B2B: "Tacta for Leagues" (Primary)
*   **Target**: Amateur leagues, Youth academies, Semi-pro clubs.
*   **Model**: Subscription (SaaS).
*   **Offering**: They upload video -> We return comprehensive match reports, player ratings, and heatmaps.

### 2. B2C: "Tacta Pro" (Secondary)
*   **Target**: Hardcore users/fans.
*   **Model**: Monthly micro-subscription ($2-$5/mo).
*   **Perks**:
    *   2x XP & Trust gain.
    *   Exclusive "Scout" badges.
    *   Access to advanced data for their own analysis.

### 3. Data Licensing (Long-term)
*   **Target**: Betting companies, Scouting agencies, Football Manager games.
*   **Model**: API Access fees.
*   **Asset**: A unique, granular dataset of lower-league football that no one else has.

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- [x] Functional Telegram Bot.
- [x] Basic User Reputation System.
- [x] Clip Slicing & Distribution.
- [x] SQLite Database Implementation.

### Phase 2: Growth & Scale
- [ ] **Web Dashboard**: A react-based portal for clubs to view their stats (Visualizations).
- [ ] **AI Pre-labeling**: Use CV models to suggest tags, users just "Confirm/Reject" (10x speed).
- [ ] **Social Sharing**: Auto-generate "Highlight Reels" for players to share on Instagram/TikTok.

### Phase 3: Ecosystem
- [ ] **Tacta Token**: Crypto-incentives for taggers (Optional/Web3 angle).
- [ ] **Scouting Marketplace**: Connect top-rated players directly with scouts via the platform.
