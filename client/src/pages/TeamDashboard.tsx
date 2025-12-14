import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams, Link, Redirect } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function TeamDashboard() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { data: team, isLoading: teamLoading } = trpc.team.getById.useQuery({ id: teamId });
  const { data: fundraisers, refetch: refetchFundraisers } = trpc.team.getFundraisers.useQuery({ teamId });
  const { data: userRole } = trpc.role.getUserRole.useQuery({ teamId });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedFundraiserId, setSelectedFundraiserId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fundraiserType, setFundraiserType] = useState<"direct_donation" | "micro_fundraiser">("direct_donation");
  const [goalAmount, setGoalAmount] = useState("");
  const [metricName, setMetricName] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [defaultPledgeAmount, setDefaultPledgeAmount] = useState("");
  const [defaultCap, setDefaultCap] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [statsValue, setStatsValue] = useState("");

  const createFundraiser = trpc.fundraiser.create.useMutation();
  const publishFundraiser = trpc.fundraiser.publish.useMutation();
  const enterStats = trpc.fundraiser.enterStats.useMutation();
  const processCharges = trpc.charge.triggerCharges.useMutation();
  const createStripeAccount = trpc.stripe.createConnectAccount.useMutation();
  const createOnboardingLink = trpc.stripe.createOnboardingLink.useMutation();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleCreateFundraiser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const config = fundraiserType === "micro_fundraiser"
        ? {
            metricName,
            metricUnit,
            defaultPledgeAmount: Math.round(parseFloat(defaultPledgeAmount) * 100),
            defaultCap: Math.round(parseFloat(defaultCap) * 100),
            eventDate,
          }
        : null;

      await createFundraiser.mutateAsync({
        teamId,
        title,
        description,
        fundraiserType,
        goalAmount: fundraiserType === "direct_donation" ? Math.round(parseFloat(goalAmount) * 100) : undefined,
        config: config ? JSON.stringify(config) : undefined,
      });

      toast.success("Fundraiser created successfully!");
      setCreateDialogOpen(false);
      refetchFundraisers();
      
      // Reset form
      setTitle("");
      setDescription("");
      setGoalAmount("");
      setMetricName("");
      setMetricUnit("");
      setDefaultPledgeAmount("");
      setDefaultCap("");
      setEventDate("");
    } catch (error) {
      toast.error("Failed to create fundraiser");
    }
  };

  const handlePublish = async (fundraiserId: number) => {
    try {
      await publishFundraiser.mutateAsync({ id: fundraiserId });
      toast.success("Fundraiser published!");
      refetchFundraisers();
    } catch (error) {
      toast.error("Failed to publish fundraiser");
    }
  };

  const handleEnterStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFundraiserId) return;

    try {
      const fundraiser = fundraisers?.find(f => f.id === selectedFundraiserId);
      const config = fundraiser?.config ? JSON.parse(fundraiser.config) : {};
      
      await enterStats.mutateAsync({
        fundraiserId: selectedFundraiserId,
        metricName: config.metricName || "Performance Metric",
        metricValue: parseFloat(statsValue),
      });

      toast.success("Stats entered successfully!");
      setStatsDialogOpen(false);
      setStatsValue("");
      refetchFundraisers();
    } catch (error) {
      toast.error("Failed to enter stats");
    }
  };

  const handleProcessCharges = async (fundraiserId: number) => {
    try {
      const result = await processCharges.mutateAsync({ fundraiserId });
      const successCount = result.results.filter(r => r.success).length;
      toast.success(`Processed ${successCount} charges successfully!`);
      refetchFundraisers();
    } catch (error) {
      toast.error("Failed to process charges");
    }
  };

  const handleStripeOnboarding = async () => {
    try {
      // Check if account exists
      if (!team?.stripeAccountId) {
        await createStripeAccount.mutateAsync({ teamId });
      }

      // Create onboarding link
      const { url } = await createOnboardingLink.mutateAsync({ teamId });
      window.location.href = url;
    } catch (error) {
      toast.error("Failed to start Stripe onboarding");
    }
  };

  if (authLoading || teamLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={getLoginUrl()} />;
  }

  if (!userRole || userRole.role !== "team_manager") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to manage this team.</p>
        </div>
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

  const needsStripeSetup = !team.stripeChargesEnabled;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{team.name} Dashboard</h1>
          <p className="text-muted-foreground">{team.description}</p>
        </div>

        {needsStripeSetup && (
          <Card className="mb-8 border-yellow-500 bg-yellow-50">
            <CardHeader>
              <CardTitle>Stripe Setup Required</CardTitle>
              <CardDescription>
                You need to complete Stripe onboarding to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleStripeOnboarding} disabled={createStripeAccount.isPending || createOnboardingLink.isPending}>
                {createStripeAccount.isPending || createOnboardingLink.isPending ? "Loading..." : "Complete Stripe Setup"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="fundraisers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="fundraisers">Fundraisers</TabsTrigger>
            <TabsTrigger value="pledges">Pledges</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="fundraisers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Fundraisers</h2>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create Fundraiser</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Fundraiser</DialogTitle>
                    <DialogDescription>Set up a new fundraising campaign for your team</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateFundraiser} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="type">Fundraiser Type *</Label>
                      <Select value={fundraiserType} onValueChange={(v: "direct_donation" | "micro_fundraiser") => setFundraiserType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct_donation">Direct Donation</SelectItem>
                          <SelectItem value="micro_fundraiser">Micro-Fundraiser (Performance-based)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {fundraiserType === "direct_donation" && (
                      <div>
                        <Label htmlFor="goal">Goal Amount ($)</Label>
                        <Input id="goal" type="number" step="0.01" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
                      </div>
                    )}

                    {fundraiserType === "micro_fundraiser" && (
                      <>
                        <div>
                          <Label htmlFor="metricName">Metric Name (e.g., "Goals Scored") *</Label>
                          <Input id="metricName" value={metricName} onChange={(e) => setMetricName(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="metricUnit">Metric Unit (e.g., "goal") *</Label>
                          <Input id="metricUnit" value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="pledgeAmount">Default Pledge Amount per Unit ($) *</Label>
                          <Input id="pledgeAmount" type="number" step="0.01" value={defaultPledgeAmount} onChange={(e) => setDefaultPledgeAmount(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="cap">Default Cap Amount ($) *</Label>
                          <Input id="cap" type="number" step="0.01" value={defaultCap} onChange={(e) => setDefaultCap(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="eventDate">Event Date</Label>
                          <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                        </div>
                      </>
                    )}

                    <DialogFooter>
                      <Button type="submit" disabled={createFundraiser.isPending}>
                        {createFundraiser.isPending ? "Creating..." : "Create Fundraiser"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {fundraisers && fundraisers.length > 0 ? (
                fundraisers.map((fundraiser) => {
                  const config = fundraiser.config ? JSON.parse(fundraiser.config) : null;
                  return (
                    <Card key={fundraiser.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{fundraiser.title}</CardTitle>
                            <CardDescription>{fundraiser.description}</CardDescription>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            fundraiser.status === "active" ? "bg-green-100 text-green-800" :
                            fundraiser.status === "draft" ? "bg-gray-100 text-gray-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {fundraiser.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Type</div>
                            <div className="font-medium">{fundraiser.fundraiserType === "direct_donation" ? "Direct Donation" : "Micro-Fundraiser"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Total Pledged</div>
                            <div className="font-medium">{formatCurrency(fundraiser.totalAmountPledged || 0)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Total Charged</div>
                            <div className="font-medium">{formatCurrency(fundraiser.totalAmountCharged || 0)}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/fundraiser/${fundraiser.id}`}>View Public Page</Link>
                          </Button>
                          
                          {fundraiser.status === "draft" && (
                            <Button onClick={() => handlePublish(fundraiser.id)} size="sm" disabled={publishFundraiser.isPending}>
                              Publish
                            </Button>
                          )}

                          {fundraiser.fundraiserType === "micro_fundraiser" && fundraiser.status === "active" && (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedFundraiserId(fundraiser.id);
                                  setStatsDialogOpen(true);
                                }}
                                size="sm"
                                variant="secondary"
                              >
                                Enter Stats
                              </Button>
                              <Button
                                onClick={() => handleProcessCharges(fundraiser.id)}
                                size="sm"
                                variant="default"
                                disabled={processCharges.isPending}
                              >
                                Process Charges
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No fundraisers yet. Create your first one to get started!
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pledges">
            <Card>
              <CardHeader>
                <CardTitle>Pledge Management</CardTitle>
                <CardDescription>View and manage all pledges for your fundraisers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Pledge management features coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Team Settings</CardTitle>
                <CardDescription>Manage your team configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Stripe Status</Label>
                    <p className="text-sm text-muted-foreground">
                      {team.stripeChargesEnabled ? "✅ Ready to accept payments" : "⚠️ Setup required"}
                    </p>
                  </div>
                  <div>
                    <Label>Platform Fee</Label>
                    <p className="text-sm text-muted-foreground">{team.feePercentage || 5}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Performance Stats</DialogTitle>
              <DialogDescription>Enter the final stats to calculate pledge amounts</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEnterStats} className="space-y-4">
              <div>
                <Label htmlFor="statsValue">Metric Value *</Label>
                <Input
                  id="statsValue"
                  type="number"
                  step="0.01"
                  value={statsValue}
                  onChange={(e) => setStatsValue(e.target.value)}
                  required
                  placeholder="e.g., 8 (for 8 goals scored)"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={enterStats.isPending}>
                  {enterStats.isPending ? "Saving..." : "Save Stats"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
