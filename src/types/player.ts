export interface Player {
  ID: number;
  Forename: string;
  Surname: string;
  ImageURL: string;
  Position?: string;
  Number?: number;
}

export interface TeamRoster {
  PlayerData: Player[];
  teamName?: string;
}

export interface MultiTeamRoster {
  [teamKey: string]: {
    name?: string;
    PlayerData: Player[];
  };
}

export interface Club {
  ClubID: number;
  ClubName: string;
  Players: Player[];
}

export interface LFPData {
  TotalClubs: number;
  TotalPlayers: number;
  Clubs: Club[];
}
