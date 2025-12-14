import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function FundraiserDetail() {
  const { id } = useParams<{ id: string }>();
  const fundraiserId = parseInt(id!);
  const { data: fundraiser, isLoading } = trpc.fundraiser.getById.useQuery({ id: fundraiserId });
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState("");
  const createDirectDonation = trpc.pledge.createDirectDonation.useMutation();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !donorEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (fundraiser?.fundraiserType === "direct_donation") {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (!amountCents || amountCents <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      try {
        await createDirectDonation.mutateAsync({ fundraiserId, donorName, donorEmail, amount: amountCents });
        toast.success("Donation created! (Stripe integration pending)");
      } catch (error) {
        toast.error("Failed to create donation");
      }
    }
  };

  if (isLoading) return <div className="container py-8"><div className="text-center">Loading...</div></div>;
  if (!fundraiser) return <div className="container py-8"><div className="text-center">Fundraiser not found</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{fundraiser.title}</CardTitle>
            <CardDescription className="text-lg">{fundraiser.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div><Label htmlFor="name">Your Name *</Label><Input id="name" value={donorName} onChange={(e) => setDonorName(e.target.value)} required /></div>
              <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} required /></div>
              {fundraiser.fundraiserType === "direct_donation" && (
                <div><Label htmlFor="amount">Amount *</Label><Input id="amount" type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
              )}
              <Button type="submit" className="w-full" disabled={createDirectDonation.isPending}>
                {createDirectDonation.isPending ? "Processing..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
