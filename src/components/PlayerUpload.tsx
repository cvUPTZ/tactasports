import { useState, useEffect } from "react";
import { Upload, RefreshCw, List, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { TeamRoster, LFPData } from "@/types/player";
import { API_BASE_URL } from "@/utils/apiConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PlayerUploadProps {
  onUpload: (teams: Map<string, TeamRoster>) => void;
}

const CLUB_NAME_MAPPING: Record<number, string> = {
  524: "جمعية الشلف",
  670: "شباب بلوزداد",
  678: "شباب قسنطينة",
  755: "نجم بن عكنون",
  694: "ترجي مستغانم",
  676: "وفاق سطيف",
  674: "شبيبة القبائل",
  672: "شبيبة الساورة",
  409: "مستقبل الرويسات",
  677: "مولودية الجزائر",
  657: "مولودية البيض",
  675: "مولودية وهران",
  758: "أولمبيك أقبو",
  680: "نادي بارادو",
  673: "إتحاد الجزائر",
  653: "إتحاد خنشلة",
};

// Official LFP Logo
const LFPLogo = () => (
  <svg width="24" height="24" viewBox="0 0 219 222" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <path d="M100.626 3.77393C106.013 0.962563 112.401 0.874376 117.851 3.51025L118.374 3.77393L206.526 49.7817C212.861 53.0876 216.832 59.6407 216.832 66.7856V155.345C216.832 162.267 213.105 168.632 207.113 172.029L206.526 172.348L118.374 218.357C112.987 221.168 106.599 221.256 101.149 218.621L100.626 218.357L12.4736 172.348C6.13957 169.042 2.1681 162.49 2.16797 155.345V66.7856C2.16797 59.8639 5.89495 53.4977 11.8867 50.1011L12.4736 49.7817L100.626 3.77393Z" stroke="white" strokeWidth="2.70765"></path>
    <path d="M101.361 18.1094C106.461 15.4474 112.541 15.4474 117.642 18.1094L193.171 57.5293C198.981 60.5617 202.624 66.5724 202.624 73.1264V149.004C202.624 155.558 198.981 161.569 193.171 164.601L117.642 204.021C112.541 206.683 106.461 206.683 101.361 204.021L25.832 164.601C20.0218 161.569 16.3788 155.558 16.3788 149.004V73.1263C16.3788 66.5724 20.0218 60.5617 25.832 57.5293L101.361 18.1094Z" fill="#A70912"></path>
  </svg>
);

export const PlayerUpload = ({ onUpload }: PlayerUploadProps) => {
  const [isScraping, setIsScraping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storedTeams, setStoredTeams] = useState<Record<string, TeamRoster>>({});
  const [selectedTeamKey, setSelectedTeamKey] = useState<string | null>(null);

  // Load stored teams on mount
  useEffect(() => {
    const saved = localStorage.getItem("lfp_scraped_data");
    if (saved) {
      try {
        setStoredTeams(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse stored teams", e);
      }
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const teamsMap = new Map<string, TeamRoster>();
        let totalPlayers = 0;

        if (json.Clubs && Array.isArray(json.Clubs)) {
          const lfpData = json as LFPData;
          lfpData.Clubs.forEach((club) => {
            const clubName = CLUB_NAME_MAPPING[club.ClubID] || club.ClubName;
            teamsMap.set(clubName, {
              teamName: clubName,
              PlayerData: club.Players
            });
            totalPlayers += club.Players.length;
          });
        }
        else if (json.PlayerData) {
          const teamName = file.name.replace('.json', '');
          teamsMap.set(teamName, json);
          totalPlayers = json.PlayerData.length;
        } else {
          Object.keys(json).forEach((teamKey) => {
            if (json[teamKey].PlayerData) {
              const teamName = json[teamKey].name || teamKey;
              teamsMap.set(teamName, json[teamKey]);
              totalPlayers += json[teamKey].PlayerData.length;
            }
          });
        }

        onUpload(teamsMap);
        toast.success("Teams loaded successfully", {
          description: `${teamsMap.size} team(s), ${totalPlayers} players imported`,
        });
      } catch (error) {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const scrapeLFPData = async () => {
    setIsScraping(true);
    const toastId = toast.loading("Connecting to LFP.dz...", { description: "Scraping live data (this may take a minute)..." });

    try {
      const response = await fetch(`${API_BASE_URL}/api/scrape-lfp`);
      if (!response.ok) throw new Error("Scraping failed");

      const teamsData = await response.json();
      const teamCount = Object.keys(teamsData).length;

      if (teamCount === 0) {
        toast.error("No data found", { id: toastId, description: "Could not extract teams from LFP.dz" });
        setIsScraping(false);
        return;
      }

      // Save to Persistence
      localStorage.setItem("lfp_scraped_data", JSON.stringify(teamsData));
      setStoredTeams(teamsData);

      toast.success("LFP Data Updated", {
        id: toastId,
        description: `Successfully cached ${teamCount} teams. Ready to select.`,
      });

      // Auto-open modal after scrape
      setIsModalOpen(true);

    } catch (error) {
      console.error("Failed to load LFP teams:", error);
      toast.error("Scraping Failed", {
        id: toastId,
        description: "Could not connect to LFP.dz or parse data.",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedTeamKey || !storedTeams[selectedTeamKey]) return;

    const team = storedTeams[selectedTeamKey];
    const teamsMap = new Map<string, TeamRoster>();
    teamsMap.set(team.teamName, team);

    onUpload(teamsMap);
    setIsModalOpen(false);
    toast.success(`Loaded ${team.teamName}`, {
      description: `${team.PlayerData.length} players imported.`,
    });
  };

  return (
    <div className="space-y-2">
      <Card className="p-4 border-2 border-dashed border-primary/30 bg-card/50 hover:border-primary/60 transition-colors">
        <label className="cursor-pointer flex items-center justify-center gap-3 py-2">
          <Upload className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Upload Team JSON</span>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </label>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={scrapeLFPData}
          disabled={isScraping}
          className="flex items-center justify-center gap-2 p-2 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/50 text-emerald-500 hover:text-emerald-400 transition-all text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
        >
          {isScraping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LFPLogo />}
          {isScraping ? "Scraping..." : "Update LFP Data"}
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={Object.keys(storedTeams).length === 0}
          className="flex items-center justify-center gap-2 p-2 rounded-md bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 text-blue-500 hover:text-blue-400 transition-all text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
        >
          <List className="w-3 h-3" />
          Select Team
        </button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Select Ligue 1 Team</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose a team from the cached LFP data to load into the analyzer.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] w-full rounded-md border border-slate-700 p-2 bg-slate-950/50">
            <div className="flex flex-col gap-1">
              {Object.keys(storedTeams).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No data cached. Click "Update Data" first.
                </div>
              ) : (
                Object.values(storedTeams).map((team) => (
                  <button
                    key={team.teamName}
                    onClick={() => setSelectedTeamKey(team.teamName)}
                    className={`flex items-center justify-between p-3 rounded-md text-sm transition-colors ${selectedTeamKey === team.teamName
                      ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-400"
                      : "hover:bg-slate-800 border border-transparent text-slate-300"
                      }`}
                  >
                    <span className="font-medium">{team.teamName}</span>
                    <span className="text-xs opacity-70 bg-slate-900 px-2 py-0.5 rounded-full">
                      {team.PlayerData.length} players
                    </span>
                    {selectedTeamKey === team.teamName && <Check className="w-4 h-4 ml-2" />}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <div className="flex justify-between w-full items-center">
              <span className="text-xs text-slate-500">
                {Object.keys(storedTeams).length} teams cached
              </span>
              <Button
                onClick={handleConfirmSelection}
                disabled={!selectedTeamKey}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Load Team
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
