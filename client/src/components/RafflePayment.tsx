import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Ticket } from "lucide-react";

interface RafflePaymentProps {
  fundraiserId: number;
  raffleTiers: Array<{
    id: number;
    tierName: string;
    price: number;
    entries: number;
    description?: string;
  }>;
  onSuccess?: () => void;
}

export default function RafflePayment({ fundraiserId, raffleTiers, onSuccess }: RafflePaymentProps) {
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");

  const createPaymentMutation = trpc.stripe.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      toast.success("Payment successful! Your raffle entries have been recorded.");
      if (onSuccess) onSuccess();
      // Reset form
      setSelectedTierId("");
      setDonorName("");
      setDonorEmail("");
      setDonorPhone("");
    },
    onError: (error) => {
      toast.error(error.message || "Payment failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTierId) {
      toast.error("Please select a ticket tier");
      return;
    }

    if (!donorName.trim() || !donorEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedTier = raffleTiers.find(t => t.id.toString() === selectedTierId);
    if (!selectedTier) {
      toast.error("Invalid tier selected");
      return;
    }

    createPaymentMutation.mutate({
      fundraiserId,
      amount: selectedTier.price,
      donorName: donorName.trim(),
      donorEmail: donorEmail.trim(),
      donorPhone: donorPhone.trim() || undefined,
      metadata: {
        tierId: selectedTier.id.toString(),
        tierName: selectedTier.tierName,
        entries: selectedTier.entries.toString(),
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Purchase Raffle Tickets
        </CardTitle>
        <CardDescription>
          Select your ticket tier and enter your information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tier Selection */}
          <div className="space-y-4">
            <Label>Select Ticket Tier</Label>
            <RadioGroup value={selectedTierId} onValueChange={setSelectedTierId}>
              {raffleTiers.map((tier) => (
                <div key={tier.id} className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value={tier.id.toString()} id={`tier-${tier.id}`} />
                  <Label
                    htmlFor={`tier-${tier.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{tier.tierName}</p>
                        <p className="text-sm text-muted-foreground">
                          {tier.entries} {tier.entries === 1 ? "entry" : "entries"}
                        </p>
                        {tier.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          ${(tier.price / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Donor Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donorName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="donorName"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donorEmail">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="donorEmail"
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donorPhone">Phone (Optional)</Label>
              <Input
                id="donorPhone"
                type="tel"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={createPaymentMutation.isPending || !selectedTierId}
          >
            {createPaymentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                Purchase Tickets
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By purchasing, you agree to the raffle terms and conditions. 
            You'll receive a confirmation email with your entry details.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
