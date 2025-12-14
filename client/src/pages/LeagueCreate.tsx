import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function LeagueCreate() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultFeePercentage, setDefaultFeePercentage] = useState("5");

  const createMutation = trpc.league.create.useMutation({
    onSuccess: (league) => {
      toast.success("League created successfully!");
      setLocation(`/league/${league.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create league");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("League name is required");
      return;
    }

    const feePercentage = parseFloat(defaultFeePercentage);
    if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
      toast.error("Fee percentage must be between 0 and 100");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      defaultFeePercentage: feePercentage,
      allowedFundraiserTypes: "direct_donation,micro_fundraiser,raffle,squares,challenge,team_vs_team,calendar,donation_matching",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create a New League</CardTitle>
            <CardDescription>
              Set up a league to organize teams and fundraisers. You'll become the league administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  League Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Youth Basketball League"
                  required
                  maxLength={255}
                />
                <p className="text-sm text-muted-foreground">
                  A clear, descriptive name for your league
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your league..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Describe the purpose, age groups, or any other relevant information
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-muted-foreground">
                  A public URL to your league's logo image
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feePercentage">Platform Fee Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="feePercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={defaultFeePercentage}
                    onChange={(e) => setDefaultFeePercentage(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Default platform fee for fundraisers (typically 3-5%)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You'll become the league administrator</li>
                  <li>• You can create teams within this league</li>
                  <li>• Teams can run fundraisers using various templates</li>
                  <li>• You'll have full control over league settings</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create League"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
