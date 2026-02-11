import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Users, Flame, ShieldAlert, Award } from "lucide-react";
import { API_BASE_URL, ANALYSIS_API_URL, API_HEADERS } from '@/utils/apiConfig';

interface LeaderboardUser {
    nickname: string;
    xp: number;
}

interface ClubRanking {
    name: string;
    xp: number;
    members: number;
}

export function CommunityHub() {
    const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardUser[]>([]);
    const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardUser[]>([]);
    const [clubs, setClubs] = useState<ClubRanking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lbRes, clubsRes] = await Promise.all([
                    fetch(`${ANALYSIS_API_URL}/api/community/leaderboard`, { headers: API_HEADERS }),
                    fetch(`${ANALYSIS_API_URL}/api/community/clubs`, { headers: API_HEADERS })
                ]);

                const lbData = await lbRes.json();
                const clubsData = await clubsRes.json();

                if (lbData.success) {
                    setOverallLeaderboard(lbData.overall);
                    setMonthlyLeaderboard(lbData.monthly);
                }
                if (clubsData.success) {
                    setClubs(clubsData.clubs);
                }
            } catch (error) {
                console.error("Failed to fetch community data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse font-mono tracking-widest uppercase">Syncing Community Data...</div>;
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-primary">Community Hub</h2>
                <p className="text-muted-foreground">Compete, rank up, and support your club in the national analyst community.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">

                {/* Monthly Top 10 */}
                <Card className="border-primary/20 bg-card/30 backdrop-blur-md shadow-xl overflow-hidden group">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                                <CardTitle className="text-base uppercase tracking-wider">Top Analysts Monthly</CardTitle>
                            </div>
                            <Badge variant="outline" className="animate-pulse border-yellow-500/50 text-yellow-500">Active</Badge>
                        </div>
                        <CardDescription className="text-xs">Top 10 earn the "Analyste Or" badge</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12 text-center">#</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">XP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyLeaderboard.map((user, idx) => (
                                    <TableRow key={idx} className="hover:bg-primary/5 transition-colors border-primary/5">
                                        <TableCell className="text-center font-mono font-bold text-muted-foreground">
                                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">{user.nickname}</TableCell>
                                        <TableCell className="text-right font-mono text-primary">{user.xp}</TableCell>
                                    </TableRow>
                                ))}
                                {monthlyLeaderboard.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground opacity-50 italic">No data this month</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Club Rankings */}
                <Card className="border-blue-500/20 bg-card/30 backdrop-blur-md shadow-xl overflow-hidden group">
                    <CardHeader className="bg-blue-500/5 border-b border-blue-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                <CardTitle className="text-base uppercase tracking-wider">Inter-Club Rankings</CardTitle>
                            </div>
                        </div>
                        <CardDescription className="text-xs">Combined XP of all club supporters</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Members</TableHead>
                                    <TableHead className="text-right">Total XP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clubs.map((club, idx) => (
                                    <TableRow key={idx} className="hover:bg-blue-500/5 transition-colors border-blue-500/5">
                                        <TableCell className="font-bold">{club.name}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                                <Users className="h-3 w-3" /> {club.members}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-blue-500">{club.xp}</TableCell>
                                    </TableRow>
                                ))}
                                {clubs.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground opacity-50 italic">No clubs recorded</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Global Hall of Fame */}
                <Card className="border-purple-500/20 bg-card/30 backdrop-blur-md shadow-xl overflow-hidden group">
                    <CardHeader className="bg-purple-500/5 border-b border-purple-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Medal className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                                <CardTitle className="text-base uppercase tracking-wider">Hall of Fame</CardTitle>
                            </div>
                        </div>
                        <CardDescription className="text-xs">Legendary analyst status across all time</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Total XP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {overallLeaderboard.map((user, idx) => (
                                    <TableRow key={idx} className="hover:bg-purple-500/5 transition-colors border-purple-500/5">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {user.nickname}
                                            {user.xp > 1000 && <Award className="h-3.5 w-3.5 text-purple-500" />}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-purple-500">{user.xp}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
