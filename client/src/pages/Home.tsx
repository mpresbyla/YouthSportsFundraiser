import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Heart, TrendingUp, Users } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: leagues, isLoading } = trpc.league.list.useQuery();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Fundraising Made Simple for Youth Sports Teams
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Empower your team with direct donations and performance-based fundraisers. 
              Secure payments, easy management, and transparent tracking.
            </p>
            {!isAuthenticated ? (
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>Get Started</a>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Heart className="h-10 w-10 mb-4 text-blue-600" />
                <CardTitle>Direct Donations</CardTitle>
                <CardDescription>
                  Accept one-time donations from supporters with immediate payment processing
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 mb-4 text-green-600" />
                <CardTitle>Performance Pledges</CardTitle>
                <CardDescription>
                  Supporters pledge per run, goal, or point scored. Payments process after the game
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 mb-4 text-purple-600" />
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Easy-to-use dashboard for managing fundraisers, tracking pledges, and processing payments
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Leagues Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Active Leagues</h2>
          
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading leagues...</div>
          ) : leagues && leagues.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map((league) => (
                <Card key={league.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    {league.logoUrl && (
                      <img
                        src={league.logoUrl}
                        alt={league.name}
                        className="h-16 w-16 object-contain mb-4"
                      />
                    )}
                    <CardTitle>{league.name}</CardTitle>
                    <CardDescription>{league.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href={`/league/${league.id}`}>View Teams</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No leagues available yet. Check back soon!
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Fundraising?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join hundreds of youth sports teams raising funds with our platform
          </p>
          {!isAuthenticated ? (
            <Button size="lg" variant="secondary" asChild>
              <a href={getLoginUrl()}>Sign Up Now</a>
            </Button>
          ) : (
            <Button size="lg" variant="secondary" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
