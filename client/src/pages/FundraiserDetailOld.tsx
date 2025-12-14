import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "sonner";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, Heart, TrendingUp, Users, DollarSign } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function DirectDonationForm({ fundraiserId, onSuccess }: { fundraiserId: number; onSuccess: () => void }) {
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [donorTip, setDonorTip] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const createDonation = trpc.pledge.createDirectDonation.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorName || !donorEmail || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    const tipCents = donorTip ? Math.round(parseFloat(donorTip) * 100) : 0;

    try {
      const result = await createDonation.mutateAsync({
        fundraiserId,
        donorName,
        donorEmail,
        donorPhone: donorPhone || undefined,
        amount: amountCents,
        donorTip: tipCents,
      });

      setClientSecret(result.clientSecret!);
    } catch (error) {
      toast.error("Failed to create donation");
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
            setDonorPhone("");
            setAmount("");
            setDonorTip("");
            onSuccess();
          }}
        />
      </Elements>
    );
  }

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
        <Label htmlFor="donorPhone">Phone (optional)</Label>
        <Input
          id="donorPhone"
          type="tel"
          value={donorPhone}
          onChange={(e) => setDonorPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
      <div>
        <Label htmlFor="amount">Donation Amount ($) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="50.00"
        />
      </div>
      <div>
        <Label htmlFor="tip">Optional Tip to Support Platform ($)</Label>
        <Input
          id="tip"
          type="number"
          step="0.01"
          min="0"
          value={donorTip}
          onChange={(e) => setDonorTip(e.target.value)}
          placeholder="5.00"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Help us keep the platform running for teams like this one
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={createDonation.isPending}>
        {createDonation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Continue to Payment"
        )}
      </Button>
    </form>
  );
}

function MicroPledgeForm({ fundraiserId, config, onSuccess }: { fundraiserId: number; config: any; onSuccess: () => void }) {
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [baseAmount, setBaseAmount] = useState(config.defaultPledgeAmount ? (config.defaultPledgeAmount / 100).toString() : "");
  const [capAmount, setCapAmount] = useState(config.defaultCap ? (config.defaultCap / 100).toString() : "");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const createPledge = trpc.pledge.createSetupIntent.useMutation();

  const estimatedMin = baseAmount ? parseFloat(baseAmount) * (config.estimatedRange?.split("-")[0] || 1) : 0;
  const estimatedMax = capAmount ? parseFloat(capAmount) : (baseAmount ? parseFloat(baseAmount) * (config.estimatedRange?.split("-")[1] || 10) : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorName || !donorEmail || !baseAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const baseAmountCents = Math.round(parseFloat(baseAmount) * 100);
    const capAmountCents = capAmount ? Math.round(parseFloat(capAmount) * 100) : undefined;

    try {
      const result = await createPledge.mutateAsync({
        fundraiserId,
        donorName,
        donorEmail,
        donorPhone: donorPhone || undefined,
        baseAmount: baseAmountCents,
        capAmount: capAmountCents,
      });

      setClientSecret(result.clientSecret!);
    } catch (error) {
      toast.error("Failed to create pledge");
    }
  };

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <SetupForm
          onSuccess={() => {
            setClientSecret(null);
            setDonorName("");
            setDonorEmail("");
            setDonorPhone("");
            setBaseAmount("");
            setCapAmount("");
            onSuccess();
          }}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
        <p className="text-sm text-blue-800">
          You'll pledge ${baseAmount || "X"} per {config.metricUnit || "unit"}. Your card will be authorized now,
          but you won't be charged until after the {config.eventDate ? "event on " + new Date(config.eventDate).toLocaleDateString() : "event"}.
          {capAmount && ` Your maximum charge is capped at $${capAmount}.`}
        </p>
        {baseAmount && (
          <p className="text-sm text-blue-800 mt-2 font-medium">
            Estimated charge: ${estimatedMin.toFixed(2)} - ${estimatedMax.toFixed(2)}
          </p>
        )}
      </div>

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
        <Label htmlFor="donorPhone">Phone (optional)</Label>
        <Input
          id="donorPhone"
          type="tel"
          value={donorPhone}
          onChange={(e) => setDonorPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
      <div>
        <Label htmlFor="baseAmount">Amount per {config.metricUnit || "unit"} ($) *</Label>
        <Input
          id="baseAmount"
          type="number"
          step="0.01"
          min="0.01"
          value={baseAmount}
          onChange={(e) => setBaseAmount(e.target.value)}
          required
          placeholder={(config.defaultPledgeAmount / 100).toFixed(2)}
        />
      </div>
      <div>
        <Label htmlFor="capAmount">Maximum Total Charge ($)</Label>
        <Input
          id="capAmount"
          type="number"
          step="0.01"
          min="0"
          value={capAmount}
          onChange={(e) => setCapAmount(e.target.value)}
          placeholder={(config.defaultCap / 100).toFixed(2)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Optional cap to limit your total contribution
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={createPledge.isPending}>
        {createPledge.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Authorize Pledge"
        )}
      </Button>
    </form>
  );
}

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

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        toast.success("Donation successful! Thank you for your support!");
        onSuccess();
      }
    } catch (err) {
      toast.error("Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800 font-medium">
          ✓ Donation details confirmed. Enter your payment information below.
        </p>
      </div>
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          "Complete Donation"
        )}
      </Button>
    </form>
  );
}

function SetupForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Authorization failed");
      } else {
        toast.success("Pledge authorized! You'll be charged after the event.");
        onSuccess();
      }
    } catch (err) {
      toast.error("Authorization failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800 font-medium">
          ✓ Pledge details confirmed. Authorize your payment method below.
        </p>
      </div>
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Authorizing...
          </>
        ) : (
          "Authorize Payment Method"
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        You won't be charged now. Your card will only be charged after the event based on the final results.
      </p>
    </form>
  );
}

export default function FundraiserDetail() {
  const { id } = useParams<{ id: string }>();
  const fundraiserId = parseInt(id!);

  const { data: fundraiser, isLoading, refetch } = trpc.fundraiser.getById.useQuery({ id: fundraiserId });
  const { data: team } = trpc.team.getById.useQuery(
    { id: fundraiser?.teamId || 0 },
    { enabled: !!fundraiser }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Fundraiser Not Found</h1>
          <p className="text-muted-foreground mb-4">This fundraiser doesn't exist or has been removed.</p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const config = fundraiser.config ? JSON.parse(fundraiser.config) : {};
  const isDirect = fundraiser.fundraiserType === "direct_donation";
  const goalProgress = fundraiser.goalAmount
    ? ((fundraiser.totalAmountCharged || 0) / fundraiser.goalAmount) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary">
              Youth Sports Fundraiser
            </Link>
            <Button asChild variant="outline">
              <Link href="/">Browse Fundraisers</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{fundraiser.title}</CardTitle>
                    <CardDescription className="text-base">
                      {team?.name} • {isDirect ? "Direct Donation" : "Performance-Based Pledge"}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      fundraiser.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {fundraiser.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{fundraiser.description}</p>

                {!isDirect && config.eventDate && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Event Date: {new Date(config.eventDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isDirect ? "Raised" : "Pledged"}
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(isDirect ? fundraiser.totalAmountCharged || 0 : fundraiser.totalAmountPledged || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {fundraiser.goalAmount && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-2xl font-bold">{formatCurrency(fundraiser.goalAmount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supporters</p>
                      <p className="text-2xl font-bold">
                        {/* This would come from a pledge count query */}
                        -
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {fundraiser.goalAmount && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress to Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={Math.min(goalProgress, 100)} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {goalProgress.toFixed(1)}% of {formatCurrency(fundraiser.goalAmount)} goal
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Donation Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  {isDirect ? "Make a Donation" : "Make a Pledge"}
                </CardTitle>
                <CardDescription>
                  {isDirect
                    ? "Support this team with a one-time donation"
                    : `Pledge per ${config.metricUnit || "unit"} and pay after the event`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fundraiser.status !== "active" ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      This fundraiser is not currently accepting {isDirect ? "donations" : "pledges"}.
                    </p>
                  </div>
                ) : isDirect ? (
                  <DirectDonationForm fundraiserId={fundraiserId} onSuccess={() => refetch()} />
                ) : (
                  <MicroPledgeForm fundraiserId={fundraiserId} config={config} onSuccess={() => refetch()} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
