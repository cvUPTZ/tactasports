import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-lfp', async (req, res) => {
    console.log("Starting LFP scraping...");
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Anti-bot detection measures
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. Go to Clubs page
        const clubsUrl = 'https://www.lfp.dz/clubs';
        console.log(`Navigating to ${clubsUrl}`);
        await page.goto(clubsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Debug: Log page title to ensure we are not blocked
        const pageTitle = await page.title();
        console.log(`Page Title: ${pageTitle}`);

        // 2. Get all Club Links
        const clubLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                // Use a broader filter to catch any club-related link
                .filter(a => a.href.includes('/club/view') || a.href.includes('/clubs/') || a.innerHTML.toLowerCase().includes('club'))
                .map(a => a.href.replace('/ar/', '/fr/')) // FORCE FRENCH
                .filter((v, i, a) => a.indexOf(v) === i); // Unique
        });

        console.log(`Found ${clubLinks.length} potential club links.`);

        const linksToScrape = clubLinks;
        const scrapedData = {};

        // 3. Visit each club page
        for (const link of linksToScrape) {
            try {
                // Ensure we are visiting the French version even if the link scraping got it wrong
                const frenchLink = link.replace('/ar/', '/fr/');
                console.log(`Scraping club: ${frenchLink}`);

                await page.goto(frenchLink, { waitUntil: 'networkidle2', timeout: 30000 });

                // Wait for the dynamic content to load (cards or table)
                try {
                    await page.waitForSelector('.club-player-card, table', { timeout: 5000 });
                } catch (e) {
                    console.log("Timeout waiting for player cards/table, proceeding anyway...");
                }

                const clubData = await page.evaluate(() => {
                    const url = window.location.href;

                    // ID-Based Mapping inside evaluate (browser context)
                    const CLUB_NAME_MAPPING = {
                        524: "ASO Chlef",
                        670: "CR Belouizdad",
                        678: "CS Constantine",
                        755: "ES Ben Aknoun",
                        694: "ES Mostaganem",
                        676: "ES Setif",
                        674: "JS Kabylie",
                        672: "JS Saoura",
                        409: "Mostakbal Rouissat",
                        677: "MC Alger",
                        657: "MC El Bayadh",
                        675: "MC Oran",
                        758: "Olympique Akbou",
                        680: "Paradou AC",
                        673: "USM Alger",
                        653: "USM Khenchela",
                        671: "US Biskra",
                        679: "NC Magra"
                    };

                    let teamName = "Unknown Club";

                    // Extract ID from URL (e.g., /club/524)
                    const idMatch = url.match(/\/club\/(\d+)/);
                    if (idMatch && idMatch[1]) {
                        const id = parseInt(idMatch[1]);
                        if (CLUB_NAME_MAPPING[id]) {
                            teamName = CLUB_NAME_MAPPING[id];
                        }
                    }

                    // Fallback to DOM if mapping fails
                    if (teamName === "Unknown Club") {
                        // Try to find a more specific header. The main H1 is often "Ligue de Football..."
                        // Try finding the second H2 or a breadcrumb
                        const breadcrumb = document.querySelector('.breadcrumb-item.active');
                        if (breadcrumb) teamName = breadcrumb.innerText.trim();
                    }

                    const players = [];
                    // STRATEGY: Card Based (based on user provided HTML)
                    const cards = Array.from(document.querySelectorAll('.club-player-card'));

                    cards.forEach(card => {
                        try {
                            const nameEl = card.querySelector('.card-title');
                            const numberEl = card.querySelector('.player-jersey');

                            if (nameEl && numberEl) {
                                const fullName = nameEl.innerText.trim();
                                const numberStr = numberEl.innerText.trim();
                                const number = parseInt(numberStr);

                                if (fullName && !isNaN(number)) {
                                    const nameSplit = fullName.split(' ');
                                    const forename = nameSplit[0] || "";
                                    const surname = nameSplit.slice(1).join(' ') || "";

                                    players.push({
                                        ID: Math.floor(Math.random() * 1000000),
                                        Forename: forename,
                                        Surname: surname,
                                        Number: number
                                    });
                                }
                            }
                        } catch (e) {
                            // ignore bad card
                        }
                    });

                    // Fallback to table if cards not found
                    if (players.length === 0) {
                        const rows = Array.from(document.querySelectorAll('table tr'));
                        rows.forEach((row) => {
                            const cols = Array.from(row.querySelectorAll('td'));
                            if (cols.length >= 2) {
                                const textContent = cols.map(c => c.innerText.trim());
                                let number = parseInt(textContent.find(t => /^\d{1,3}$/.test(t)));
                                let nameParts = textContent.filter(t => t.length > 3 && !/^\d+$/.test(t));
                                if (nameParts.length > 0 && number && number < 99) {
                                    players.push({
                                        ID: Math.floor(Math.random() * 1000000),
                                        Forename: nameParts[0].split(' ')[0],
                                        Surname: nameParts[0].split(' ').slice(1).join(' '),
                                        Number: number
                                    });
                                }
                            }
                        });
                    }

                    return { teamName, players, cardCount: cards.length };
                });

                console.log(`Debug ${clubData.teamName}: Found ${clubData.cardCount} cards. Extracted ${clubData.players.length} players.`);

                if (clubData.players.length > 0) {
                    scrapedData[clubData.teamName] = {
                        teamName: clubData.teamName,
                        PlayerData: clubData.players
                    };
                }

            } catch (err) {
                console.error(`Error scraping ${link}:`, err.message);
            }
        }

        await browser.close();

        console.log(`Scraping complete. Found ${Object.keys(scrapedData).length} teams.`);
        res.json(scrapedData);

    } catch (error) {
        console.error("Scraping failed:", error);
        if (browser) await browser.close();
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
});

export default router;
