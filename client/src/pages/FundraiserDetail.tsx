import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, Gift, Calendar, Grid3x3, Target, Users2, DollarSign, Trophy } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Payment Form Component (shared across all templates)
function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname + "?success=true",
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setIsProcessing(false);
    } else {
      toast.success("Payment successful!");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

// Raffle Entry Form
function RaffleEntryForm({ fundraiserId, onSuccess }: { fundraiserId: number; onSuccess: () => void }) {
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: tiers } = trpc.templates.getRaffleTiers.useQuery({ fundraiserId });
  const createEntry = trpc.pledge.createDirectDonation.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorName || !donorEmail || !selectedTierId) {
      toast.error("Please fill in all fields");
      return;
    }

    const tier = tiers?.find(t => t.id.toString() === selectedTierId);
    if (!tier) return;

    try {
      const result = await createEntry.mutateAsync({
        fundraiserId,
        donorName,
        donorEmail,
        amount: tier.price,
        donorTip: 0,
      });

      setClientSecret(result.clientSecret!);
    } catch (error) {
      toast.error("Failed to create raffle entry");
    }
  };

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm
          onSuccess={() => {
            setClientSecret(null);
            setDonorName("");
            setDonorEmail("");
            setSelectedTierId("");
            onSuccess();
          }}
        />
      </Elements>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="donorName">Your Name *</Label>
        <Input
          id="donorName"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          required
          placeholder="John Doe"
        />
      </div>
      <div>
        <Label htmlFor="donorEmail">Email *</Label>
        <Input
          id="donorEmail"
          type="email"
          value={donorEmail}
          onChange={(e) => setDonorEmail(e.target.value)}
          required
          placeholder="john@example.com"
        />
      </div>
      <div>
        <Label htmlFor="tier">Select Entry Tier *</Label>
        <Select value={selectedTierId} onValueChange={setSelectedTierId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a tier" />
          </SelectTrigger>
          <SelectContent>
            {tiers?.map((tier) => (
              <SelectItem key={tier.id} value={tier.id.toString()}>
                {tier.label || `${formatCurrency(tier.price)} = ${tier.entries} ${tier.entries === 1 ? 'entry' : 'entries'}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={createEntry.isPending} className="w-full">
        {createEntry.isPending ? "Processing..." : "Continue to Payment"}
      </Button>
    </form>
  );
}

// Main Fundraiser Detail Component
export default function FundraiserDetailNew() {
  const { id } = useParams<{ id: string }>();
  const fundraiserId = parseInt(id || "0");

  const { data: fundraiser, isLoading, refetch } = trpc.fundraiser.getById.useQuery(
    { id: fundraiserId },
    { enabled: !!fundraiserId }
  );

  const { data: team } = trpc.team.getById.useQuery(
    { id: fundraiser?.teamId || 0 },
    { enabled: !!fundraiser?.teamId }
  );

  // Template-specific data
  const { data: raffleItems } = trpc.templates.getRaffleItems.useQuery(
    { fundraiserId },
    { enabled: fundraiser?.fundraiserTemplate === "raffle" }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Fundraiser Not Found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (fundraiser.status === "draft") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Fundraiser Not Available</h1>
          <p className="text-muted-foreground mb-6">
            This fundraiser is still in draft mode and hasn't been published yet.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = fundraiser.goalAmount
    ? ((fundraiser.totalAmountPledged || 0) / fundraiser.goalAmount) * 100
    : 0;

  const getTemplateIcon = () => {
    switch (fundraiser.fundraiserTemplate) {
      case "raffle": return <Gift className="h-6 w-6" />;
      case "calendar": return <Calendar className="h-6 w-6" />;
      case "squares": return <Grid3x3 className="h-6 w-6" />;
      case "challenge": return <Target className="h-6 w-6" />;
      case "team_vs_team": return <Users2 className="h-6 w-6" />;
      case "donation_matching": return <DollarSign className="h-6 w-6" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              {getTemplateIcon()}
              <span className="px-4 py-1 bg-white/20 rounded-full text-sm font-medium">
                {fundraiser.fundraiserTemplate.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <h1 className="text-5xl font-bold">{fundraiser.title}</h1>
            {fundraiser.description && (
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                {fundraiser.description}
              </p>
            )}
            {team && (
              <div className="text-blue-100">
                Supporting <span className="font-semibold">{team.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              {fundraiser.goalAmount && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fundraising Progress</CardTitle>
                    <CardDescription>
                      {formatCurrency(fundraiser.totalAmountPledged || 0)} raised of{" "}
                      {formatCurrency(fundraiser.goalAmount)} goal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={Math.min(progress, 100)} className="h-3" />
                    <div className="mt-2 text-sm text-muted-foreground text-center">
                      {Math.round(progress)}% complete
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Template-Specific Content */}
              {fundraiser.fundraiserTemplate === "raffle" && raffleItems && raffleItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Raffle Prizes
                    </CardTitle>
                    <CardDescription>Win amazing prizes while supporting the team!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {raffleItems.map((item) => (
                        <Card key={item.id} className="border-2">
                          <CardHeader>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            {item.description && (
                              <CardDescription>{item.description}</CardDescription>
                            )}
                          </CardHeader>
                          {item.sponsorName && (
                            <CardContent>
                              <div className="text-sm text-muted-foreground">
                                Sponsored by <span className="font-medium">{item.sponsorName}</span>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* About Section */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Fundraiser</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-medium capitalize">{fundraiser.status}</div>
                    </div>
                    {fundraiser.endDate && (
                      <div>
                        <div className="text-sm text-muted-foreground">End Date</div>
                        <div className="font-medium">
                          {new Date(fundraiser.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {fundraiser.totalAmountCharged > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground">Total Raised</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(fundraiser.totalAmountCharged)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Participation Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle>
                      {fundraiser.fundraiserTemplate === "raffle" ? "Enter Raffle" : "Support This Fundraiser"}
                    </CardTitle>
                    <CardDescription>
                      {fundraiser.fundraiserTemplate === "raffle"
                        ? "Select your entry tier and enter to win!"
                        : "Make a contribution to support the team"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fundraiser.fundraiserTemplate === "raffle" ? (
                      <RaffleEntryForm fundraiserId={fundraiserId} onSuccess={refetch} />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Participation form coming soon
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
