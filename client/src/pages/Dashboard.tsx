import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Link, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { Users, TrendingUp, DollarSign, Calendar, Plus, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Fetch user's teams
  const { data: myTeams, isLoading: teamsLoading } = trpc.team.getMyTeams.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch user's donations
  const { data: myDonations, isLoading: donationsLoading } = trpc.charge.getMyCharges.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch platform stats for the user
  const { data: userStats } = trpc.auth.getMyStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={getLoginUrl()} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground mt-2">
              Manage your teams, fundraisers, and donations from here
            </p>
          </div>
          <Button asChild>
            <Link href="/leagues/create">
              <Plus className="w-4 h-4 mr-2" />
              Create League
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams Managed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.teamsManaged || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active teams you manage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Fundraisers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.activeFundraisers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(userStats?.totalRaised || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all fundraisers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Donations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myDonations?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total contributions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Teams */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Teams</CardTitle>
                  <CardDescription>Teams you manage</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">
                    Browse All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <p className="text-sm text-muted-foreground">Loading teams...</p>
              ) : myTeams && myTeams.length > 0 ? (
                <div className="space-y-4">
                  {myTeams.slice(0, 5).map((team: any) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {team.league?.name || "No league"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {team._count?.fundraisers || 0} fundraisers
                        </Badge>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/team/${team.id}/dashboard`}>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    You're not managing any teams yet
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/">Browse Leagues</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest donations and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {donationsLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : myDonations && myDonations.length > 0 ? (
                <div className="space-y-4">
                  {myDonations.slice(0, 5).map((donation: any) => (
                    <div
                      key={donation.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          Donated ${donation.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          to {donation.fundraiser?.title || "Unknown fundraiser"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          donation.status === "completed"
                            ? "default"
                            : donation.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {donation.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No recent activity
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/">Explore Fundraisers</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto py-4 flex-col items-start">
                <Link href="/leagues/create">
                  <Plus className="w-5 h-5 mb-2" />
                  <span className="font-semibold">Create a League</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Start organizing teams
                  </span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-4 flex-col items-start">
                <Link href="/">
                  <Users className="w-5 h-5 mb-2" />
                  <span className="font-semibold">Browse Teams</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Find teams to support
                  </span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-4 flex-col items-start">
                <Link href="/">
                  <TrendingUp className="w-5 h-5 mb-2" />
                  <span className="font-semibold">View Fundraisers</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Support active campaigns
                  </span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
