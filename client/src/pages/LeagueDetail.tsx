import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const leagueId = parseInt(id!);

  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery({ id: leagueId });
  const { data: teams, isLoading: teamsLoading } = trpc.league.getTeams.useQuery({ leagueId });

  if (leagueLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading league...</div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="container py-8">
        <div className="text-center">League not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="mb-8">
          {league.logoUrl && (
            <img
              src={league.logoUrl}
              alt={league.name}
              className="h-24 w-24 object-contain mb-4"
            />
          )}
          <h1 className="text-4xl font-bold mb-2">{league.name}</h1>
          {league.description && (
            <p className="text-lg text-muted-foreground">{league.description}</p>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">Teams</h2>

        {teamsLoading ? (
          <div className="text-center text-muted-foreground">Loading teams...</div>
        ) : teams && teams.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  {team.logoUrl && (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="h-16 w-16 object-contain mb-4"
                    />
                  )}
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>{team.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/team/${team.id}`}>View Fundraisers</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No teams in this league yet.
          </div>
        )}
      </div>
    </div>
  );
}
