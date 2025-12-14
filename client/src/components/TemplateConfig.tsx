import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FundraiserTemplate } from "./TemplateSelector";
import { Plus, X } from "lucide-react";

interface TemplateConfigProps {
  template: FundraiserTemplate;
  onSubmit: (config: any) => void;
  onBack: () => void;
}

export function TemplateConfig({ template, onSubmit, onBack }: TemplateConfigProps) {
  const [config, setConfig] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  if (template === "raffle") {
    return <RaffleConfig config={config} setConfig={setConfig} onSubmit={handleSubmit} onBack={onBack} />;
  }

  if (template === "calendar") {
    return <CalendarConfig config={config} setConfig={setConfig} onSubmit={handleSubmit} onBack={onBack} />;
  }

  if (template === "squares") {
    return <SquaresConfig config={config} setConfig={setConfig} onSubmit={handleSubmit} onBack={onBack} />;
  }

  if (template === "challenge") {
    return <ChallengeConfig config={config} setConfig={setConfig} onSubmit={handleSubmit} onBack={onBack} />;
  }

  if (template === "donation_matching") {
    return <DonationMatchingConfig config={config} setConfig={setConfig} onSubmit={handleSubmit} onBack={onBack} />;
  }

  // Default config for direct_donation and micro_fundraiser
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
          <CardDescription>
            This template uses the standard configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="goalAmount">Goal Amount ($)</Label>
            <Input
              id="goalAmount"
              type="number"
              value={config.goalAmount || ""}
              onChange={(e) => setConfig({ ...config, goalAmount: parseInt(e.target.value) * 100 })}
              placeholder="5000"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function RaffleConfig({ config, setConfig, onSubmit, onBack }: any) {
  const [items, setItems] = useState<any[]>([{ title: "", description: "" }]);
  const [tiers, setTiers] = useState<any[]>([
    { price: 5, entries: 1, label: "$5 = 1 entry" },
    { price: 20, entries: 5, label: "$20 = 5 entries" },
    { price: 50, entries: 15, label: "$50 = 15 entries" },
  ]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...config, items, tiers }); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Raffle Prizes</CardTitle>
          <CardDescription>Add the items people can win</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Prize title (e.g., Signed Baseball Bat)"
                  value={item.title}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].title = e.target.value;
                    setItems(newItems);
                  }}
                />
                <Textarea
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].description = e.target.value;
                    setItems(newItems);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems([...items, { title: "", description: "" }])}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Prize
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entry Tiers</CardTitle>
          <CardDescription>Pricing options for raffle entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map((tier, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Price"
                value={tier.price}
                onChange={(e) => {
                  const newTiers = [...tiers];
                  newTiers[idx].price = parseInt(e.target.value);
                  setTiers(newTiers);
                }}
              />
              <Input
                type="number"
                placeholder="Entries"
                value={tier.entries}
                onChange={(e) => {
                  const newTiers = [...tiers];
                  newTiers[idx].entries = parseInt(e.target.value);
                  setTiers(newTiers);
                }}
              />
              <Input
                placeholder="Label"
                value={tier.label}
                onChange={(e) => {
                  const newTiers = [...tiers];
                  newTiers[idx].label = e.target.value;
                  setTiers(newTiers);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Create Raffle</Button>
      </div>
    </form>
  );
}

function CalendarConfig({ config, setConfig, onSubmit, onBack }: any) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Settings</CardTitle>
          <CardDescription>Configure your pick-a-date fundraiser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={config.month || ""}
              onChange={(e) => setConfig({ ...config, month: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="basePrice">Base Price per Date ($)</Label>
            <Input
              id="basePrice"
              type="number"
              value={config.basePrice || ""}
              onChange={(e) => setConfig({ ...config, basePrice: parseInt(e.target.value) * 100 })}
              placeholder="10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Create Calendar</Button>
      </div>
    </form>
  );
}

function SquaresConfig({ config, setConfig, onSubmit, onBack }: any) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Squares Grid Settings</CardTitle>
          <CardDescription>Configure your Super Bowl squares</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="homeTeam">Home Team</Label>
            <Input
              id="homeTeam"
              value={config.homeTeam || ""}
              onChange={(e) => setConfig({ ...config, homeTeam: e.target.value })}
              placeholder="Chiefs"
            />
          </div>
          <div>
            <Label htmlFor="awayTeam">Away Team</Label>
            <Input
              id="awayTeam"
              value={config.awayTeam || ""}
              onChange={(e) => setConfig({ ...config, awayTeam: e.target.value })}
              placeholder="49ers"
            />
          </div>
          <div>
            <Label htmlFor="pricePerSquare">Price per Square ($)</Label>
            <Input
              id="pricePerSquare"
              type="number"
              value={config.pricePerSquare || ""}
              onChange={(e) => setConfig({ ...config, pricePerSquare: parseInt(e.target.value) * 100 })}
              placeholder="10"
            />
          </div>
          <div>
            <Label htmlFor="eventDate">Event Date</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              value={config.eventDate || ""}
              onChange={(e) => setConfig({ ...config, eventDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Create Squares Grid</Button>
      </div>
    </form>
  );
}

function ChallengeConfig({ config, setConfig, onSubmit, onBack }: any) {
  const [goals, setGoals] = useState<any[]>([{ goalAmount: "", challengeDescription: "" }]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...config, goals }); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Challenge Goals</CardTitle>
          <CardDescription>Set milestone challenges for your fundraiser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  type="number"
                  placeholder="Goal amount ($)"
                  value={goal.goalAmount}
                  onChange={(e) => {
                    const newGoals = [...goals];
                    newGoals[idx].goalAmount = e.target.value;
                    setGoals(newGoals);
                  }}
                />
                <Textarea
                  placeholder="Challenge description (e.g., Coach shaves beard)"
                  value={goal.challengeDescription}
                  onChange={(e) => {
                    const newGoals = [...goals];
                    newGoals[idx].challengeDescription = e.target.value;
                    setGoals(newGoals);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setGoals(goals.filter((_, i) => i !== idx))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setGoals([...goals, { goalAmount: "", challengeDescription: "" }])}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Goal
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Create Challenge</Button>
      </div>
    </form>
  );
}

function DonationMatchingConfig({ config, setConfig, onSubmit, onBack }: any) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(config); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Donation Matching Settings</CardTitle>
          <CardDescription>Configure sponsor matching campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sponsorName">Sponsor Name</Label>
            <Input
              id="sponsorName"
              value={config.sponsorName || ""}
              onChange={(e) => setConfig({ ...config, sponsorName: e.target.value })}
              placeholder="Local Business Inc."
            />
          </div>
          <div>
            <Label htmlFor="matchAmount">Maximum Match Amount ($)</Label>
            <Input
              id="matchAmount"
              type="number"
              value={config.matchAmount || ""}
              onChange={(e) => setConfig({ ...config, matchAmount: parseInt(e.target.value) * 100 })}
              placeholder="1000"
            />
          </div>
          <div>
            <Label htmlFor="matchRatio">Match Ratio (%)</Label>
            <Input
              id="matchRatio"
              type="number"
              value={config.matchRatio || 100}
              onChange={(e) => setConfig({ ...config, matchRatio: parseInt(e.target.value) })}
              placeholder="100"
            />
            <p className="text-sm text-muted-foreground mt-1">
              100% = dollar-for-dollar match, 50% = $0.50 per dollar
            </p>
          </div>
          <div>
            <Label htmlFor="expiresAt">Expires At (optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={config.expiresAt || ""}
              onChange={(e) => setConfig({ ...config, expiresAt: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Create Matching Campaign</Button>
      </div>
    </form>
  );
}
