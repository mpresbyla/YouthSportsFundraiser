import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { ArrowLeft, DollarSign, Target } from "lucide-react";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);

  const { data: team, isLoading: teamLoading } = trpc.team.getById.useQuery({ id: teamId });
  const { data: fundraisers, isLoading: fundraisersLoading } = trpc.team.getFundraisers.useQuery({ teamId });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      draft: "secondary",
      completed: "outline",
      paused: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (teamLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container py-8">
        <div className="text-center">Team not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/league/${team.leagueId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to League
          </Link>
        </Button>

        <div className="mb-8">
          {team.logoUrl && (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="h-24 w-24 object-contain mb-4"
            />
          )}
          <h1 className="text-4xl font-bold mb-2">{team.name}</h1>
          {team.description && (
            <p className="text-lg text-muted-foreground">{team.description}</p>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">Active Fundraisers</h2>

        {fundraisersLoading ? (
          <div className="text-center text-muted-foreground">Loading fundraisers...</div>
        ) : fundraisers && fundraisers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fundraisers.filter(f => f.status === "active").map((fundraiser) => {
              const config = fundraiser.config ? JSON.parse(fundraiser.config) : null;
              
              return (
                <Card key={fundraiser.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex-1">{fundraiser.title}</CardTitle>
                      {getStatusBadge(fundraiser.status)}
                    </div>
                    <CardDescription>{fundraiser.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {fundraiser.fundraiserType === "direct_donation" && fundraiser.goalAmount && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4" />
                          <span>Goal: {formatCurrency(fundraiser.goalAmount)}</span>
                        </div>
                      )}
                      
                      {fundraiser.fundraiserType === "micro_fundraiser" && config && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {formatCurrency(config.defaultPledgeAmount)} per {config.metricUnit}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          {fundraiser.fundraiserType === "direct_donation" 
                            ? "Direct Donation" 
                            : "Performance Pledge"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/fundraiser/${fundraiser.id}`}>
                        {fundraiser.fundraiserType === "direct_donation" ? "Donate Now" : "Make a Pledge"}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No active fundraisers at the moment. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
}
