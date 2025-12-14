import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, TrendingUp, Target, Users, Calendar, DollarSign, Gift, Grid3x3 } from "lucide-react";

export type FundraiserTemplate = 
  | "direct_donation"
  | "micro_fundraiser"
  | "raffle"
  | "squares"
  | "challenge"
  | "team_vs_team"
  | "calendar"
  | "donation_matching";

interface TemplateOption {
  id: FundraiserTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  difficulty: "Easy" | "Medium" | "Advanced";
  estimatedRevenue: string;
}

const templates: TemplateOption[] = [
  {
    id: "direct_donation",
    name: "Direct Donations",
    description: "Accept one-time donations from supporters with immediate payment processing",
    icon: <Heart className="h-8 w-8 text-blue-600" />,
    popular: true,
    difficulty: "Easy",
    estimatedRevenue: "$500-$2,000",
  },
  {
    id: "micro_fundraiser",
    name: "Performance Pledges",
    description: "Supporters pledge per run, goal, or point scored. Payments process after the game",
    icon: <TrendingUp className="h-8 w-8 text-green-600" />,
    popular: true,
    difficulty: "Easy",
    estimatedRevenue: "$1,000-$5,000",
  },
  {
    id: "raffle",
    name: "Raffles",
    description: "Physical or digital prizes with tiered entry pricing. Auto-generate winner",
    icon: <Gift className="h-8 w-8 text-purple-600" />,
    popular: true,
    difficulty: "Medium",
    estimatedRevenue: "$2,000-$10,000",
  },
  {
    id: "calendar",
    name: "Pick-a-Date Calendar",
    description: "Each date has a dollar amount. Someone buys a date → fills the calendar",
    icon: <Calendar className="h-8 w-8 text-orange-600" />,
    difficulty: "Easy",
    estimatedRevenue: "$500-$3,000",
  },
  {
    id: "squares",
    name: "Super Bowl Squares",
    description: "Grid-based betting for sports events with quarter payouts",
    icon: <Grid3x3 className="h-8 w-8 text-red-600" />,
    difficulty: "Advanced",
    estimatedRevenue: "$1,000-$10,000",
  },
  {
    id: "challenge",
    name: "Goal Challenges",
    description: "Crowd-funded dares: 'Coach shaves beard if we hit $2,000'",
    icon: <Target className="h-8 w-8 text-yellow-600" />,
    difficulty: "Easy",
    estimatedRevenue: "$500-$3,000",
  },
  {
    id: "team_vs_team",
    name: "Team vs Team",
    description: "Two teams fundraising side-by-side with live leaderboard. Loser does a challenge",
    icon: <Users className="h-8 w-8 text-indigo-600" />,
    difficulty: "Medium",
    estimatedRevenue: "$2,000-$8,000",
  },
  {
    id: "donation_matching",
    name: "Donation Matching",
    description: "All donations matched up to $X by sponsor. Creates urgency with countdown",
    icon: <DollarSign className="h-8 w-8 text-teal-600" />,
    difficulty: "Medium",
    estimatedRevenue: "$1,000-$5,000",
  },
];

interface TemplateSelectorProps {
  selectedTemplate: FundraiserTemplate | null;
  onSelect: (template: FundraiserTemplate) => void;
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose a Fundraiser Template</h2>
        <p className="text-muted-foreground mt-2">
          Select a proven fundraising strategy that works best for your team
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id
                ? "ring-2 ring-primary shadow-lg"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(template.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {template.icon}
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.popular && (
                      <Badge variant="secondary" className="mt-1">
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{template.difficulty}</Badge>
                </div>
                <span className="text-muted-foreground font-medium">
                  {template.estimatedRevenue}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
