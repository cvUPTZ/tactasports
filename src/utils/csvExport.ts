import { LoggedEvent } from "@/hooks/useGamepad";

export const exportToCSV = (events: LoggedEvent[]) => {
  if (events.length === 0) {
    return;
  }

  // CSV Header
  const headers = [
    "ID",
    "Timestamp",
    "Match Time",
    "Mode",
    "Team",
    "Event",
    "Player",
    "Zone",
    "Sub Type",
    "X",
    "Y"
  ];

  // CSV Rows
  const rows = events.map(event => [
    event.id,
    event.timestamp,
    event.matchTime || "",
    event.mode || "POST_MATCH", // Default to POST_MATCH if undefined
    event.team,
    `"${event.eventName}"`, // Quote event name to handle commas
    event.player ? `"${event.player.name}"` : "",
    event.zone || "",
    event.subType || "",
    event.x || "",
    event.y || ""
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `soccer_events_${new Date().toISOString()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
