import fs from 'fs';
import path from 'path';
import { analyzeTactics } from './src/utils/analysisEngine';
import { LoggedEvent } from './src/hooks/useGamepad';

// Get file path from command line args
const filePath = process.argv[2];

if (!filePath) {
    console.error("❌ Usage: npx ts-node verify_analytics.ts <path_to_events.json>");
    console.error("Please export events from the application (Admin -> Export) and provide the file path.");
    process.exit(1);
}

try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const events: LoggedEvent[] = JSON.parse(rawData);

    if (!Array.isArray(events)) {
        throw new Error("File must contain an array of LoggedEvent objects.");
    }

    console.log(`\n📊 Analyzing ${events.length} events from ${path.basename(filePath)}...`);
    const result = analyzeTactics(events);

    console.log("\n--- TEAM A KPIs ---");
    console.log(JSON.stringify(result.kpis.teamA, null, 2));
    console.log("\n--- TEAM A Recommendations ---");
    console.log(result.recommendations.teamA);

    console.log("\n--- TEAM B KPIs ---");
    console.log(JSON.stringify(result.kpis.teamB, null, 2));
    console.log("\n--- TEAM B Recommendations ---");
    console.log(result.recommendations.teamB);

    console.log("\n✅ Verification Complete.");

} catch (error) {
    console.error(`❌ Error reading or parsing file: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
}
